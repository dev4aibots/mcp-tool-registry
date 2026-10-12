'use client';

import { useRef, useState } from 'react';
import { Banner, Button, Label, Text } from '@primer/react';
import { PageHeader, Blankslate } from '@primer/react/experimental';
import { AlertIcon } from '@primer/octicons-react';
import { buildRequest, callLocal, type RpcCall } from '@/lib/rpc';
import { JsonView, pretty } from '@/components/JsonView';

type ErrorCase = {
  key: string;
  title: string;
  description: string;
  expected: string;
  build: (id: number) => string;
};

const CASES: ErrorCase[] = [
  {
    key: 'unknown-tool',
    title: 'Unknown tool',
    description:
      'tools/call with a name the registry does not serve. The real handler throws -32602 "Unknown tool: no_such_tool".',
    expected: '-32602 · Invalid params',
    build: (id) => buildRequest(id, 'tools/call', { name: 'no_such_tool', arguments: {} }),
  },
  {
    key: 'bad-version',
    title: 'Unsupported protocol version',
    description:
      'The _meta protocolVersion is set to "2027-01-01", a future version the server does not support. Negotiation data is echoed back.',
    expected: '-32022 · Unsupported protocol version',
    build: (id) => buildRequest(id, 'tools/list', {}, '2027-01-01'),
  },
  {
    key: 'schema-invalid',
    title: 'Schema-invalid arguments',
    description:
      'incidents_get requires "id" — the hand-rolled schema validator rejects the call. Per the real protocol this is a tool result with isError: true, not a JSON-RPC error.',
    expected: 'result · isError: true',
    build: (id) => buildRequest(id, 'tools/call', { name: 'incidents_get', arguments: {} }),
  },
  {
    key: 'unknown-incident',
    title: 'Unknown incident id',
    description:
      'The incidents_get executor throws for an id the store never had. The protocol catches executor throws and returns an isError tool result.',
    expected: 'result · isError: true',
    build: (id) => buildRequest(id, 'tools/call', { name: 'incidents_get', arguments: { id: 'INC-404' } }),
  },
];

export default function ErrorShowcasePage() {
  const [results, setResults] = useState<Record<string, RpcCall>>({});
  const nextId = useRef(1);

  const fire = (errorCase: ErrorCase) => {
    const id = nextId.current++;
    // Each button dispatches through the real server core — the envelopes
    // below are its verbatim output, not fixtures.
    const call = callLocal(errorCase.build(id));
    setResults((prev) => ({ ...prev, [errorCase.key]: call }));
  };

  return (
    <div>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Error paths</PageHeader.Title>
        </PageHeader.TitleArea>
        <PageHeader.Description>
          One click per failure mode. Every envelope shown is produced live by{' '}
          <Text as="code" className="t-code">dispatchJsonRpc</Text> — the same parse/validate/dispatch path
          the stdio server runs, with the real error codes (-32602, -32022) and real isError tool results.
        </PageHeader.Description>
      </PageHeader>

      <Banner
        title="Exact envelopes"
        variant="warning"
        description="These are not illustrations. The request on the left is sent to the live core; the response on the right is what it returns, byte for byte."
        className="mt-3"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: 'var(--space-md)',
          marginTop: 'var(--space-md)',
        }}
      >
        {CASES.map((errorCase) => {
          const result = results[errorCase.key];
          return (
            <div key={errorCase.key} className="panel col">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <Text as="h2" className="section-heading">
                  {errorCase.title}
                </Text>
                <Label variant="attention">{errorCase.expected}</Label>
              </div>
              <Text className="t-body-muted">{errorCase.description}</Text>
              <div>
                <Button leadingVisual={AlertIcon} onClick={() => fire(errorCase)}>
                  Fire {errorCase.title.toLowerCase()}
                </Button>
              </div>
              {result ? (
                <div className="col">
                  <div className="row">
                    {result.isErrorEnvelope ? (
                      <Label variant="danger">error {result.errorCode}</Label>
                    ) : result.isToolError ? (
                      <Label variant="severe">isError result</Label>
                    ) : (
                      <Label variant="success">result</Label>
                    )}
                    <Text className="t-caption-muted">{result.latencyMs}ms</Text>
                  </div>
                  <JsonView json={pretty(result.requestJson)} wrap />
                  <JsonView json={pretty(result.responseJson)} wrap />
                </div>
              ) : (
                <Blankslate>
                  <Blankslate.Description>Not fired yet.</Blankslate.Description>
                </Blankslate>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
