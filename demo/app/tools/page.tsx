'use client';

import { useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { Button, CounterLabel, IconButton, Label, Link, Spinner, Stack, Text } from '@primer/react';
import { PageHeader, DataTable, createColumnHelper, Blankslate, Dialog } from '@primer/react/experimental';
import { CodeIcon, CopyIcon, ToolsIcon, PaperAirplaneIcon } from '@primer/octicons-react';
import { buildRequest, callLocal } from '@/lib/rpc';
import type { ToolDescriptor } from '@/lib/mcp/types.js';
import { JsonView } from '@/components/JsonView';

type ToolRow = {
  id: string;
  name: string;
  description: string;
  // Flat row on purpose: the table's ObjectPaths<Data> typing recurses into
  // the recursive JsonSchema type. Full descriptors live in `tools` state.
  destructive: boolean;
};

const columnHelper = createColumnHelper<ToolRow>();

// Console preset index that calls this tool, for the "Try in console" link.
const CONSOLE_PRESET: Record<string, number> = {
  incidents_list: 2,
  incidents_get: 3,
  incidents_ack: 4,
};

export default function ToolRegistryPage() {
  const [tools, setTools] = useState<ToolDescriptor[] | null>(null);
  const [selected, setSelected] = useState<ToolDescriptor | null>(null);
  const [copied, setCopied] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);

  useEffect(() => {
    // Real tools/list call through the ported protocol core
    const call = callLocal(buildRequest(1, 'tools/list'));
    try {
      const parsed = JSON.parse(call.responseJson) as {
        result?: { tools?: ToolDescriptor[] };
        error?: { message?: string };
      };
      if (parsed.error) throw new Error(parsed.error.message ?? 'tools/list failed');
      setTools(parsed.result?.tools ?? []);
    } catch (err) {
      setRawError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const rows: ToolRow[] = useMemo(
    () =>
      (tools ?? []).map((t) => ({
        id: t.name,
        name: t.name,
        description: t.description,
        destructive: t.annotations?.destructiveHint === true,
      })),
    [tools],
  );

  const readOnlyCount = rows.filter((r) => !r.destructive).length;
  const writeCount = rows.filter((r) => r.destructive).length;

  const columns = useMemo(
    () => [
      columnHelper.column({
        header: 'Tool',
        field: 'name',
        rowHeader: true,
        sortBy: true,
        renderCell: (row) => (
          <Stack direction="horizontal" align="center" gap="condensed" wrap="wrap">
            <Link
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setSelected(tools?.find((t) => t.name === row.name) ?? null);
              }}
              className="t-body-semibold"
            >
              <Text as="code" className="t-code">
                {row.name}
              </Text>
            </Link>
            {row.destructive ? (
              <Label variant="danger">write op</Label>
            ) : (
              <Label variant="success">read-only</Label>
            )}
          </Stack>
        ),
      }),
      columnHelper.column({
        header: 'Description',
        field: 'description',
        sortBy: true,
        width: 'grow',
        renderCell: (row) => <Text className="t-body-muted">{row.description}</Text>,
      }),
      columnHelper.column({
        header: 'Schema',
        id: 'schema',
        align: 'end',
        width: 'auto',
        renderCell: (row) => (
          <IconButton
            aria-label={`View input schema for ${row.name}`}
            icon={CodeIcon}
            size="small"
            onClick={() => setSelected(tools?.find((t) => t.name === row.name) ?? null)}
          />
        ),
      }),
    ],
    [tools],
  );

  const copySchema = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selected.inputSchema, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Tool registry</PageHeader.Title>
        </PageHeader.TitleArea>
        <PageHeader.Description>
          Every tool your AI assistant can plug into, in one catalog. This registry lists the
          plug-in tools one server offers. Read what each tool accepts, then try it for real in
          the console.
        </PageHeader.Description>
        <PageHeader.Actions>
          <Button as={NextLink} href="/console">
            Open console
          </Button>
        </PageHeader.Actions>
      </PageHeader>

      {/* README-style intro: what this server is and how to use the catalog */}
      <div className="panel mt-3 mb-3">
        <Text as="h2" className="display-accent mb-2" style={{ fontSize: '20px', fontWeight: 600 }}>
          About this registry
        </Text>
        <Text className="t-body-muted block mb-2">
          An MCP server is a plug-in pack: it hands an AI assistant extra tools it can call. This
          demo is one such server, <Text as="code" className="t-code">com.example/internal-incidents</Text>,
          offering three tools that manage an incident log. The list below comes from a live{' '}
          <Text as="code" className="t-code">tools/list</Text> call against the real protocol code,
          not a fixture.
        </Text>
        <Stack direction="horizontal" gap="normal" wrap="wrap" align="center">
          <Text className="t-body-semibold">Try it:</Text>
          <Text className="t-body-muted">1. Scan the table.</Text>
          <Text className="t-body-muted">2. Open a tool to read its input schema.</Text>
          <Text className="t-body-muted">3. Send a real call from the console.</Text>
        </Stack>
        {tools !== null && (
          <Stack direction="horizontal" gap="normal" wrap="wrap" align="center" className="mt-2">
            <Text className="t-caption-muted">
              <CounterLabel>{tools.length}</CounterLabel> tools
            </Text>
            <Text className="t-caption-muted">
              <CounterLabel>{readOnlyCount}</CounterLabel> read-only
            </Text>
            <Text className="t-caption-muted">
              <CounterLabel>{writeCount}</CounterLabel> write op
            </Text>
          </Stack>
        )}
      </div>

      <div className="mt-3">
        {rawError !== null ? (
          <Blankslate>
            <Blankslate.Visual>
              <ToolsIcon size="medium" />
            </Blankslate.Visual>
            <Blankslate.Heading>tools/list failed</Blankslate.Heading>
            <Blankslate.Description>{rawError}</Blankslate.Description>
          </Blankslate>
        ) : tools === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl) 0' }}>
            <Spinner size="large" aria-label="Loading tools" />
          </div>
        ) : (
          <DataTable aria-labelledby="tools-heading" data={rows} columns={columns} />
        )}
      </div>

      {selected !== null && (
        <Dialog title={`Input schema: ${selected.name}`} onClose={() => setSelected(null)} width="large">
          <Stack direction="vertical" gap="normal">
            <Text className="t-body-muted">{selected.description}</Text>
            <Text as="h2" className="section-heading du-section-rule">
              Input schema
            </Text>
            <JsonView json={JSON.stringify(selected.inputSchema, null, 2)} />
            <Stack direction="horizontal" gap="normal" wrap="wrap">
              <Button leadingVisual={CopyIcon} onClick={copySchema}>
                {copied ? 'Copied' : 'Copy schema'}
              </Button>
              <Button
                as={NextLink}
                href={`/console?preset=${CONSOLE_PRESET[selected.name] ?? 2}`}
                leadingVisual={PaperAirplaneIcon}
              >
                Try {selected.name} in the console
              </Button>
              <Button variant="invisible" onClick={() => setSelected(null)}>
                Close
              </Button>
            </Stack>
          </Stack>
        </Dialog>
      )}
    </div>
  );
}
