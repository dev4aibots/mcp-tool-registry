'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Details,
  FormControl,
  Label,
  SegmentedControl,
  Select,
  Spinner,
  SplitPageLayout,
  Stack,
  Text,
  Timeline,
} from '@primer/react';
import { PageHeader, Blankslate } from '@primer/react/experimental';
import {
  PlayIcon,
  PaperAirplaneIcon,
  CheckIcon,
  XIcon,
  TerminalIcon,
} from '@primer/octicons-react';
import { buildRequest, callHttp, callLocal, type RpcCall } from '@/lib/rpc';
import { demoFixture } from '@/lib/mcp/index.js';
import { JsonView, pretty } from '@/components/JsonView';

type Transport = 'browser' | 'http';

const PRESETS: Array<{ label: string; method: string; params: Record<string, unknown> }> = [
  { label: 'server/discover', method: 'server/discover', params: {} },
  { label: 'tools/list', method: 'tools/list', params: {} },
  {
    label: 'tools/call → incidents_list',
    method: 'tools/call',
    params: { name: 'incidents_list', arguments: { severity: 'p0' } },
  },
  {
    label: 'tools/call → incidents_get',
    method: 'tools/call',
    params: { name: 'incidents_get', arguments: { id: 'INC-101' } },
  },
  {
    label: 'tools/call → incidents_ack',
    method: 'tools/call',
    params: { name: 'incidents_ack', arguments: { id: 'INC-101' } },
  },
];

const TRACE_STEP_TITLES = [
  'Discover server capabilities',
  'List registered tools',
  'List p0 incidents',
  'Fetch INC-101',
  'Acknowledge INC-101',
  'Re-fetch INC-101 (ack visible)',
  'Call unknown tool (error path)',
  'Unsupported protocol version (error path)',
];

type TraceStep = {
  index: number;
  requestJson: string;
  call: RpcCall;
};

export default function ConsolePage() {
  const [presetIdx, setPresetIdx] = useState(2);
  const [editorText, setEditorText] = useState(() =>
    pretty(buildRequest(1, PRESETS[2].method, PRESETS[2].params)),
  );
  const [editorError, setEditorError] = useState<string | null>(null);
  const [transport, setTransport] = useState<Transport>('browser');
  const [sending, setSending] = useState(false);
  const [lastCall, setLastCall] = useState<RpcCall | null>(null);
  const [trace, setTrace] = useState<TraceStep[] | null>(null);
  const [traceRunning, setTraceRunning] = useState(false);
  const requestId = useRef(100);

  const applyPreset = (idx: number) => {
    setPresetIdx(idx);
    const preset = PRESETS[idx];
    setEditorText(pretty(buildRequest(requestId.current++, preset.method, preset.params)));
    setEditorError(null);
  };

  const send = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(editorText);
    } catch {
      setEditorError('Request is not valid JSON — fix it before sending.');
      return;
    }
    setEditorError(null);
    setSending(true);
    try {
      const requestJson = JSON.stringify(parsed);
      const call =
        transport === 'browser' ? callLocal(requestJson) : await callHttp(requestJson);
      setLastCall(call);
      setTrace(null);
    } finally {
      setSending(false);
    }
  };

  const runDemoTrace = () => {
    // The verbatim 8-step demoFixture — the same parity oracle the tests run,
    // executed step by step through dispatchJsonRpc.
    setTraceRunning(true);
    setLastCall(null);
    setTrace([]);
    const fixture = demoFixture();
    const steps: TraceStep[] = fixture.map((req, i) => {
      const requestJson = JSON.stringify(req);
      const call = callLocal(requestJson);
      return { index: i, requestJson, call };
    });
    // Animated reveal: steps appear one at a time (150ms apart, instant under
    // reduced motion via CSS). The RPC work itself is synchronous and instant.
    steps.forEach((_, i) => {
      window.setTimeout(() => {
        setTrace((prev) => (prev === null ? null : [...prev, steps[i]]));
        if (i === steps.length - 1) setTraceRunning(false);
      }, i * 150);
    });
  };

  const statusLine = useMemo(() => {
    if (!lastCall) return null;
    if (lastCall.isErrorEnvelope) {
      return `JSON-RPC error ${lastCall.errorCode} · ${lastCall.latencyMs}ms`;
    }
    if (lastCall.isToolError) return `200 OK · tool error (isError) · ${lastCall.latencyMs}ms`;
    return `200 OK · ${lastCall.latencyMs}ms`;
  }, [lastCall]);

  return (
    <div>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>JSON-RPC console</PageHeader.Title>
        </PageHeader.TitleArea>
        <PageHeader.Description>
          Compose raw JSON-RPC requests and dispatch them against the real protocol core — the exact{' '}
          <Text as="code" className="t-code">dispatchJsonRpc</Text> path the stdio server used. Request and
          response are shown verbatim, nothing is prettified away.
        </PageHeader.Description>
      </PageHeader>

      <SplitPageLayout className="mt-3">
        <SplitPageLayout.Pane position="start" aria-label="Request composer">
          <Stack direction="vertical" gap="normal">
            <div>
              <Text as="h2" className="section-heading mb-2">
                Request
              </Text>
              <FormControl>
                <FormControl.Label>Method preset</FormControl.Label>
                <Select
                  aria-label="Method preset"
                  value={String(presetIdx)}
                  onChange={(event) => applyPreset(Number(event.target.value))}
                  className="w-full"
                >
                  {PRESETS.map((preset, idx) => (
                    <Select.Option key={preset.label} value={String(idx)}>
                      {preset.label}
                    </Select.Option>
                  ))}
                </Select>
              </FormControl>
            </div>

            <FormControl>
              <FormControl.Label>Raw JSON-RPC request</FormControl.Label>
              <textarea
                aria-label="Raw JSON-RPC request"
                className="code-editor"
                rows={14}
                value={editorText}
                onChange={(event) => {
                  setEditorText(event.target.value);
                  setEditorError(null);
                }}
                spellCheck={false}
              />
              {editorError !== null && (
                <FormControl.Validation variant="error">{editorError}</FormControl.Validation>
              )}
              <FormControl.Caption>
                The <Text as="code" className="t-code">_meta</Text> carries the protocol version the server
                validates — change it to see -32022.
              </FormControl.Caption>
            </FormControl>

            <div>
              <Text className="t-caption-muted block mb-1">Transport</Text>
              <SegmentedControl aria-label="Transport">
                <SegmentedControl.Button
                  selected={transport === 'browser'}
                  onClick={() => setTransport('browser')}
                  aria-label="In-browser dispatch"
                >
                  Browser
                </SegmentedControl.Button>
                <SegmentedControl.Button
                  selected={transport === 'http'}
                  onClick={() => setTransport('http')}
                  aria-label="HTTP round-trip to /api/rpc"
                >
                  HTTP /api/rpc
                </SegmentedControl.Button>
              </SegmentedControl>
              <Text className="t-caption-muted block mt-1">
                {transport === 'browser'
                  ? 'In-process dispatchJsonRpc — browser session store.'
                  : 'POST to /api/rpc — same code path, server-side session store.'}
              </Text>
            </div>

            <Stack direction="horizontal" gap="normal" wrap="wrap">
              <Button variant="primary" leadingVisual={PaperAirplaneIcon} onClick={send} disabled={sending}>
                {sending ? 'Sending…' : 'Send request'}
              </Button>
              <Button
                leadingVisual={PlayIcon}
                onClick={runDemoTrace}
                disabled={traceRunning}
              >
                {traceRunning ? 'Running…' : 'Run demo trace'}
              </Button>
            </Stack>
          </Stack>
        </SplitPageLayout.Pane>

        <SplitPageLayout.Content aria-label="Response">
          {trace !== null ? (
            <div>
              <Text as="h2" className="section-heading mb-2">
                Demo trace — 8 steps
              </Text>
              <Timeline>
                {trace.map((step) => {
                  const failed = step.call.isErrorEnvelope || step.call.isToolError;
                  return (
                    <Timeline.Item key={step.index} className="trace-step">
                      <Timeline.Badge>{failed ? <XIcon /> : <CheckIcon />}</Timeline.Badge>
                      <Timeline.Body>
                        <div className="row mb-2">
                          <Text className="t-body-semibold">
                            Step {step.index + 1} — {TRACE_STEP_TITLES[step.index]}
                          </Text>
                          {failed ? (
                            <Label variant="danger">
                              {step.call.isErrorEnvelope ? `error ${step.call.errorCode}` : 'isError'}
                            </Label>
                          ) : (
                            <Label variant="success">ok</Label>
                          )}
                          <Text className="t-caption-muted">{step.call.latencyMs}ms</Text>
                        </div>
                        <Details>
                          <Details.Summary>Verbatim request / response</Details.Summary>
                          <div className="mt-2">
                            <Stack direction="vertical" gap="normal">
                              <JsonView json={pretty(step.requestJson)} />
                              <JsonView json={pretty(step.call.responseJson)} />
                            </Stack>
                          </div>
                        </Details>
                      </Timeline.Body>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
              {traceRunning && (
                <div className="row mt-2">
                  <Spinner size="small" />
                  <Text className="t-caption-muted">Executing fixture steps…</Text>
                </div>
              )}
            </div>
          ) : lastCall === null ? (
            <Blankslate>
              <Blankslate.Visual>
                <TerminalIcon size="medium" />
              </Blankslate.Visual>
              <Blankslate.Heading>No request sent yet</Blankslate.Heading>
              <Blankslate.Description>
                Pick a preset, edit the raw JSON, and send — or run the 8-step demo trace.
              </Blankslate.Description>
              <Blankslate.PrimaryAction onClick={send}>Send request</Blankslate.PrimaryAction>
            </Blankslate>
          ) : (
            <Stack direction="vertical" gap="normal">
              <div className="row">
                <Text className="t-caption-muted">{statusLine}</Text>
                {lastCall.isErrorEnvelope ? (
                  <Label variant="danger">error envelope</Label>
                ) : lastCall.isToolError ? (
                  <Label variant="attention">isError result</Label>
                ) : (
                  <Label variant="success">result</Label>
                )}
                <Label variant="accent">{transport === 'browser' ? 'browser' : 'http'}</Label>
              </div>
              <div>
                <Text as="h2" className="section-heading mb-2">
                  Request
                </Text>
                <JsonView json={pretty(lastCall.requestJson)} />
              </div>
              <div>
                <Text as="h2" className="section-heading mb-2">
                  Response
                </Text>
                <JsonView json={pretty(lastCall.responseJson)} />
              </div>
            </Stack>
          )}
        </SplitPageLayout.Content>
      </SplitPageLayout>

      <Banner
        title="Same code path, honest labels"
        variant="info"
        description="Browser transport calls dispatchJsonRpc directly in this tab (module-scoped session). HTTP transport POSTs the identical raw string to /api/rpc, which calls the same dispatchJsonRpc on the server's session context — including its own ack state. Neither path invents data."
        className="mt-3"
      />
    </div>
  );
}
