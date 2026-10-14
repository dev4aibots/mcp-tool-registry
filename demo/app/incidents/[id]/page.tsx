'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import NextLink from 'next/link';
import {
  AvatarStack,
  Banner,
  Button,
  ConfirmationDialog,
  Flash,
  Label,
  LabelGroup,
  Link,
  PageLayout,
  Spinner,
  StateLabel,
  Text,
  Timeline,
} from '@primer/react';
import { PageHeader, Blankslate } from '@primer/react/experimental';
import { AlertIcon, CheckIcon, ClockIcon } from '@primer/octicons-react';
import { buildRequest, callLocal, contentJson } from '@/lib/rpc';
import type { Incident } from '@/lib/mcp/types.js';
import { JsonView, pretty } from '@/components/JsonView';

const SEVERITY_VARIANT: Record<Incident['severity'], 'danger' | 'severe' | 'attention'> = {
  p0: 'danger',
  p1: 'severe',
  p2: 'attention',
};

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  const [incident, setIncident] = useState<Incident | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acking, setAcking] = useState(false);
  const [justAcked, setJustAcked] = useState(false);
  const [lastCall, setLastCall] = useState<string | null>(null);

  const load = useCallback(() => {
    // Real incidents_get call through the ported protocol core
    const call = callLocal(buildRequest(1, 'tools/call', { name: 'incidents_get', arguments: { id } }));
    const inc = contentJson<Incident>(call.responseJson);
    if (inc === null) {
      setNotFound(true);
      setIncident(null);
    } else {
      setIncident(inc);
      setNotFound(false);
    }
    setLastCall(call.responseJson);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const acknowledge = () => {
    setAcking(true);
    // Real incidents_ack: a write op against the session store
    callLocal(buildRequest(2, 'tools/call', { name: 'incidents_ack', arguments: { id } }));
    load();
    setAcking(false);
    setConfirmOpen(false);
    setJustAcked(true);
  };

  return (
    <div>
      <Banner
        title="How acknowledgements are stored"
        variant="info"
        description="Acknowledging writes to this tab's session only. It survives moving between pages here, but a full page reload resets the log to its original three incidents. The console's HTTP option keeps a separate session on the server."
        className="mb-3"
      />

      {notFound ? (
        <Blankslate>
          <Blankslate.Visual>
            <AlertIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>No incident {id}</Blankslate.Heading>
          <Blankslate.Description>
            The real <Text as="code" className="t-code">incidents_get</Text> executor throws{' '}
            <Text as="code" className="t-code">not found: {id}</Text> for this id, and the protocol wraps it as an{' '}
            <Text as="code" className="t-code">isError</Text> tool result. Try one from the dashboard.
          </Blankslate.Description>
          <Blankslate.PrimaryAction href="/incidents">Back to incidents</Blankslate.PrimaryAction>
        </Blankslate>
      ) : incident === null ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl) 0' }}>
          <Spinner size="large" aria-label="Loading incident" />
        </div>
      ) : (
        <PageLayout>
          <PageLayout.Header>
            <PageHeader>
              <PageHeader.TitleArea>
                <PageHeader.LeadingVisual>
                  {incident.acked ? <CheckIcon size={24} /> : <AlertIcon size={24} />}
                </PageHeader.LeadingVisual>
                <PageHeader.Title>
                  {incident.id}: {incident.title}
                </PageHeader.Title>
              </PageHeader.TitleArea>
              <PageHeader.Actions>
                {incident.acked ? (
                  <StateLabel status="issueClosed">Acknowledged</StateLabel>
                ) : (
                  <StateLabel status="issueOpened">Open</StateLabel>
                )}
                <Label variant={SEVERITY_VARIANT[incident.severity]}>{incident.severity}</Label>
              </PageHeader.Actions>
            </PageHeader>
          </PageLayout.Header>

          <PageLayout.Content>
            {justAcked && (
              <Flash variant="success" className="mb-3">
                Incident {incident.id} acknowledged. The state change below comes from a fresh{' '}
                <Text as="code" className="t-code">incidents_get</Text> after the write.
              </Flash>
            )}

            <Text as="h2" className="section-heading mb-2">
              Live record
            </Text>
            <JsonView json={pretty(lastCall ?? '{}')} />

            <Text as="h2" className="section-heading mt-4 mb-2">
              Activity
            </Text>
            <Timeline>
              <Timeline.Item>
                <Timeline.Badge>
                  <AlertIcon />
                </Timeline.Badge>
                <Timeline.Body>
                  <Text>
                    <strong>Opened.</strong> Reported to the incident store with severity{' '}
                    {incident.severity}.
                  </Text>
                </Timeline.Body>
              </Timeline.Item>
              {incident.acked ? (
                <Timeline.Item>
                  <Timeline.Badge>
                    <CheckIcon />
                  </Timeline.Badge>
                  <Timeline.Body>
                    <Text>
                      <strong>Acknowledged</strong> with{' '}
                      <Text as="code" className="t-code">incidents_ack</Text>. The session store was
                      updated.
                    </Text>
                  </Timeline.Body>
                </Timeline.Item>
              ) : (
                <Timeline.Item>
                  <Timeline.Badge>
                    <ClockIcon />
                  </Timeline.Badge>
                  <Timeline.Body>
                    <Text className="t-body-muted">
                      Awaiting acknowledgement. Nothing recorded for this incident yet.
                    </Text>
                  </Timeline.Body>
                </Timeline.Item>
              )}
            </Timeline>

            <div className="mt-4">
              {/* NextLink (SPA): same JS realm, so the shared session store keeps
                  the ack. The list re-fetches on mount and shows Acknowledged.
                  A full browser reload still resets to pristine fixtures. */}
              <Link as={NextLink} href="/incidents">
                ← Back to all incidents
              </Link>
            </div>
          </PageLayout.Content>

          <PageLayout.Pane>
            <Text as="h2" className="section-heading mb-2">
              Details
            </Text>
            <div className="col mb-3">
              <div>
                <Text className="t-caption-muted">Assignees</Text>
                <div className="mt-1">
                  <AvatarStack>
                    <img
                      src="https://github.com/dev4aibots.png"
                      alt="dev4aibots"
                      width={28}
                      height={28}
                      style={{ borderRadius: 'var(--borderRadius-full)' }}
                    />
                  </AvatarStack>
                </div>
              </div>
              <div>
                <Text className="t-caption-muted">Labels</Text>
                <div className="mt-1">
                  <LabelGroup>
                    <Label variant={SEVERITY_VARIANT[incident.severity]}>{incident.severity}</Label>
                    <Label variant={incident.acked ? 'success' : 'default'}>
                      {incident.acked ? 'acknowledged' : 'open'}
                    </Label>
                  </LabelGroup>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              disabled={incident.acked || acking}
              onClick={() => setConfirmOpen(true)}
              className="w-full"
            >
              {incident.acked ? 'Acknowledged' : acking ? 'Acknowledging…' : 'Acknowledge incident'}
            </Button>
            <Text className="t-caption-muted block mt-2">
              Calls <Text as="code" className="t-code">tools/call</Text> →{' '}
              <Text as="code" className="t-code">incidents_ack</Text> with a confirmation step.
            </Text>
          </PageLayout.Pane>
        </PageLayout>
      )}

      {confirmOpen && incident !== null && (
        <ConfirmationDialog
          title={`Acknowledge ${incident.id}?`}
          onClose={(gesture) => {
            // Only the explicit "Acknowledge" confirm button performs the write.
            // Every other dismissal (Cancel button, X, Escape) just closes.
            if (gesture === 'confirm') acknowledge();
            else setConfirmOpen(false);
          }}
          confirmButtonContent="Acknowledge"
          confirmButtonType="primary"
          cancelButtonContent="Cancel"
        >
          <Text>
            This runs <Text as="code" className="t-code">incidents_ack</Text> in this tab's
            session. The incident will show as Acknowledged everywhere in this demo.
          </Text>
        </ConfirmationDialog>
      )}
    </div>
  );
}
