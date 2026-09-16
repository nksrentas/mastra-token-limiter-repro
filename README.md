# TokenLimiter reproductions (@mastra/core 1.67.0)

Two small reproductions of TokenLimiterProcessor behaviour. No API key is needed: both use a fake
LanguageModelV2 that records the prompt it receives.

```bash
npm install
node repro.mjs
node repro-history.mjs
```

## repro.mjs — the current run's tool call and result are removed between steps

A tool returns a result larger than the limiter's budget. With a TokenLimiter present, the result
never reaches the model, the agent calls the tool again, and the final answer is wrong.

```
limit 2000: model calls 4, listRules called 3x, tool result reached the model: false, final text: "I could not read the rules."
limit none: model calls 2, listRules called 1x, tool result reached the model: true, final text: "You have 400 rules."
```

## repro-history.mjs — history tool results are counted although ToolCallFilter removes them

ToolCallFilter is configured to exclude `listRules`, so its result is never sent. TokenLimiter still
counts it and drops the whole assistant message, including the text the model should have seen.

```
limit 8000: messages sent 5, agent's earlier answer present: false, tool result present: false, user name present: true
limit 16000: messages sent 6, agent's earlier answer present: true, tool result present: false, user name present: true
```

Environment: @mastra/core 1.67.0, Node 22.18.0, macOS 26.6.2 (arm64).
