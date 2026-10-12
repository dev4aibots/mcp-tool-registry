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
  buttonLabel: string;
  build: (id: number) => string;
};

const CASES: ErrorCase[] = [
  {
    key: 'unknown-tool',
    title: 'Call an unknown tool',
    description:
      'tools/call asks for no_such_tool, a name this registry never registered. The real handler rejects it with error -32602.',
    expected: '-32602 · Invalid params',
    buttonLabel: 'Fire unknown tool',
    build: (id) => buildRequest(id, 'tools/call', { name: 'no_such_tool', arguments: {} }),
  },
  {
    key: 'bad-version',
    title: 'Send a future protocol version',
    description:
      'The _meta stamp claims version 2027-01-01, which this server does not support. Negotiation fails with -32022 and the server echoes back what it does support.',
    expected: '-32022 · Unsupported protocol version',
    buttonLabel: 'Fire future version',
    build: (id) => buildRequest(id, 'tools/list', {}, '2027-01-01'),
  },
  {
    key: 'schema-invalid',
    title: 'Skip a required argument',
    description:
      'incidents_get needs an id argument. The schema check rejects the call before anything runs, and the protocol returns it as a tool result with isError: true, not as a JSON-RPC error.',
    expected: 'result · isError: true',
    buttonLabel: 'Fire missing argument',
    build: (id) => buildRequest(id, 'tools/call', { name: 'incidents_get', arguments: {} }),
  },
  {
    key: 'unknown-incident',
    title: 'Ask for a missing incident',
    description:
      'incidents_get looks up INC-404, an id the log never had. The lookup throws, and the protocol reports it honestly as a tool result with isError: true.',
    expected: 'result · isError: true',
    buttonLabel: 'Fire missing incident',
    build: (id) => buildRequest(id, 'tools/call', { name: 'incidents_get', arguments: { id: 'INC-404' } }),
  },
];

export default function ErrorShowcasePage() {
  const [results, setResults] = useState<Record<string, RpcCall>>({});
  const nextId = useRef(1);

  const fire = (errorCase: ErrorCase) => {
    const id = nextId.current++;
    // Each button dispatches through the real server core. The envelopes below
    // are its verbatim output, not fixtures.
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
          One click per failure mode. Every answer below is produced live by the real request
          handler, the same code path the original server runs. The error codes are real:
          -32602, -32022, and honest isError results.
        </PageHeader.Description>
      </PageHeader>

      <Banner
        title="Real answers, not illustrations"
        variant="warning"
        description="The request on the left is sent to the live core; the response on the right is what it returns, byte for byte."
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
                  {errorCase.buttonLabel}
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
                  <Blankslate.Description>
                    Not fired yet. Press the button above to send this broken request.
                  </Blankslate.Description>
                </Blankslate>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
