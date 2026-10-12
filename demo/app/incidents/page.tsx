'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import {
  ActionList,
  ActionMenu,
  Button,
  Label,
  LabelGroup,
  Link,
  Spinner,
  StateLabel,
  Text,
  TextInput,
  Token,
} from '@primer/react';
import { PageHeader, DataTable, createColumnHelper, Blankslate } from '@primer/react/experimental';
import { SearchIcon, AlertIcon, CheckIcon, FilterIcon } from '@primer/octicons-react';
import { buildRequest, callLocal, contentJson } from '@/lib/rpc';
import type { Incident } from '@/lib/mcp/types.js';

type Severity = 'p0' | 'p1' | 'p2';

type IncidentRow = Incident & { id: string; ackLabel: string };

const SEVERITY_VARIANT: Record<Severity, 'danger' | 'severe' | 'attention'> = {
  p0: 'danger',
  p1: 'severe',
  p2: 'attention',
};

const columnHelper = createColumnHelper<IncidentRow>();

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set());
  const [ackFilter, setAckFilter] = useState<'all' | 'open' | 'acked'>('all');

  useEffect(() => {
    // Real incidents_list call through the ported protocol core
    const call = callLocal(buildRequest(1, 'tools/call', { name: 'incidents_list', arguments: {} }));
    const list = contentJson<Incident[]>(call.responseJson);
    if (list === null) {
      setError('incidents_list returned no content');
      return;
    }
    setIncidents(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const rows: IncidentRow[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (incidents ?? [])
      .filter((i) => (severityFilter.size === 0 ? true : severityFilter.has(i.severity)))
      .filter((i) => (ackFilter === 'all' ? true : ackFilter === 'acked' ? i.acked : !i.acked))
      .filter((i) =>
        q === '' ? true : `${i.id} ${i.title} ${i.severity}`.toLowerCase().includes(q),
      )
      .map((i) => ({ ...i, ackLabel: i.acked ? 'acknowledged' : 'open' }));
  }, [incidents, query, severityFilter, ackFilter]);

  const columns = useMemo(
    () => [
      columnHelper.column({
        header: 'Incident',
        field: 'id',
        rowHeader: true,
        sortBy: true,
        renderCell: (row) => (
          // NextLink (SPA): keeps the module-level session store alive across
          // navigation, so an ack made on the detail page is visible here.
          <Link as={NextLink} href={`/incidents/${row.id}`} className="t-body-semibold">
            {row.id}
          </Link>
        ),
      }),
      columnHelper.column({
        header: 'Title',
        field: 'title',
        sortBy: true,
        width: 'grow',
        renderCell: (row) => <Text>{row.title}</Text>,
      }),
      columnHelper.column({
        header: 'Severity',
        field: 'severity',
        sortBy: true,
        width: 'auto',
        renderCell: (row) => <Label variant={SEVERITY_VARIANT[row.severity]}>{row.severity}</Label>,
      }),
      columnHelper.column({
        header: 'Status',
        field: 'ackLabel',
        sortBy: true,
        width: 'auto',
        renderCell: (row) =>
          row.acked ? (
            <StateLabel status="issueClosed">Acknowledged</StateLabel>
          ) : (
            <StateLabel status="issueOpened">Open</StateLabel>
          ),
      }),
    ],
    [],
  );

  const toggleSeverity = (sev: Severity) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  const hasFilters = severityFilter.size > 0 || ackFilter !== 'all' || query.trim() !== '';
  const clearAll = () => {
    setSeverityFilter(new Set());
    setAckFilter('all');
    setQuery('');
    router.replace('/incidents');
  };

  return (
    <div>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Incidents</PageHeader.Title>
        </PageHeader.TitleArea>
        <PageHeader.Description>
          Live results of <Text as="code" className="t-code">incidents_list</Text> — the same executor the
          stdio server runs. Acknowledging an incident flips its status here and on the detail page.
        </PageHeader.Description>
      </PageHeader>

      {/* Filter bar — sticky, per DESIGN.md z-index + shadow tokens */}
      <div
        className="row mt-3 mb-2"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 'var(--zIndex-sticky)',
          backgroundColor: 'var(--bgColor-default)',
          padding: 'var(--space-sm) 0',
          boxShadow: 'var(--shadow-resting-small)',
        }}
      >
        <TextInput
          aria-label="Search incidents"
          placeholder="Search id, title, severity"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          leadingVisual={SearchIcon}
        />
        <ActionMenu>
          <ActionMenu.Button leadingVisual={FilterIcon}>Severity</ActionMenu.Button>
          <ActionMenu.Overlay>
            <ActionList>
              {(['p0', 'p1', 'p2'] as Severity[]).map((sev) => (
                <ActionList.Item
                  key={sev}
                  role="menuitemcheckbox"
                  selected={severityFilter.has(sev)}
                  onSelect={() => toggleSeverity(sev)}
                >
                  <Label variant={SEVERITY_VARIANT[sev]} className="mr-1">
                    {sev}
                  </Label>
                  {sev === 'p0' ? 'Critical' : sev === 'p1' ? 'High' : 'Medium'}
                </ActionList.Item>
              ))}
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
        <ActionMenu>
          <ActionMenu.Button leadingVisual={FilterIcon}>Status</ActionMenu.Button>
          <ActionMenu.Overlay>
            <ActionList>
              {(
                [
                  ['all', 'All'],
                  ['open', 'Open'],
                  ['acked', 'Acknowledged'],
                ] as Array<['all' | 'open' | 'acked', string]>
              ).map(([value, label]) => (
                <ActionList.Item
                  key={value}
                  role="menuitemradio"
                  selected={ackFilter === value}
                  onSelect={() => setAckFilter(value)}
                >
                  {label}
                </ActionList.Item>
              ))}
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
        {hasFilters && (
          <Button variant="invisible" size="small" onClick={clearAll}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="mb-2">
          <LabelGroup>
            {[...severityFilter].map((sev) => (
              <Token
                key={sev}
                text={sev}
                onRemove={() => toggleSeverity(sev)}
                hideRemoveButton={false}
              />
            ))}
            {ackFilter !== 'all' && (
              <Token text={ackFilter === 'acked' ? 'acknowledged' : 'open'} onRemove={() => setAckFilter('all')} />
            )}
          </LabelGroup>
        </div>
      )}

      <div className="mt-2">
        {error !== null ? (
          <Blankslate>
            <Blankslate.Visual>
              <AlertIcon size="medium" />
            </Blankslate.Visual>
            <Blankslate.Heading>Could not load incidents</Blankslate.Heading>
            <Blankslate.Description>{error}</Blankslate.Description>
          </Blankslate>
        ) : incidents === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl) 0' }}>
            <Spinner size="large" aria-label="Loading incidents" />
          </div>
        ) : rows.length === 0 ? (
          <Blankslate>
            <Blankslate.Visual>
              <CheckIcon size="medium" />
            </Blankslate.Visual>
            <Blankslate.Heading>No incidents match</Blankslate.Heading>
            <Blankslate.Description>
              Nothing matches the current filters. Clearing them shows all incidents from the live
              store.
            </Blankslate.Description>
            <Blankslate.PrimaryAction onClick={clearAll}>Clear filters</Blankslate.PrimaryAction>
          </Blankslate>
        ) : (
          <DataTable aria-labelledby="incidents-heading" data={rows} columns={columns} />
        )}
      </div>
    </div>
  );
}

export default function IncidentDashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
