import { Agent } from '@mastra/core/agent';
import { ToolCallFilter, TokenLimiter } from '@mastra/core/processors';

const bigRules = Array.from({ length: 400 }, (_, i) => ({
    id: i,
    name: `Rule number ${i} boosting chairs and tables in the living room category`,
    active: true
}));

const history = [
    { role: 'user', content: 'Hi, my name is Nikos.' },
    { role: 'assistant', content: 'Nice to meet you, Nikos.' },
    { role: 'user', content: 'List all my rules.' },
    {
        role: 'assistant',
        content: [
            { type: 'tool-call', toolCallId: 'call_1', toolName: 'listRules', input: {} }
        ]
    },
    {
        role: 'tool',
        content: [
            { type: 'tool-result', toolCallId: 'call_1', toolName: 'listRules', output: { type: 'json', value: { rules: bigRules } } }
        ]
    },
    { role: 'assistant', content: 'You have 400 rules.' }
];

let seenPrompt = null;
const model = {
    specificationVersion: 'v2',
    provider: 'fake',
    modelId: 'fake',
    supportedUrls: {},
    async doGenerate({ prompt }) {
        seenPrompt = prompt;
        return {
            content: [{ type: 'text', text: 'ok' }],
            finishReason: 'stop',
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            warnings: []
        };
    },
    async doStream() {
        throw new Error('not used');
    }
};

const run = async (limit) => {
    const agent = new Agent({
        id: 'repro-history',
        name: 'repro-history',
        instructions: 'You are helpful.',
        model,
        inputProcessors: [new ToolCallFilter({ exclude: ['listRules'] }), new TokenLimiter(limit)]
    });
    await agent.generate([...history, { role: 'user', content: 'How many rules did you say I have?' }]);
    const text = JSON.stringify(seenPrompt);
    console.log(`limit ${limit}: messages sent ${seenPrompt.length}, agent's earlier answer present: ${text.includes('You have 400 rules.')}, tool result present: ${text.includes('Rule number 399')}, user name present: ${text.includes('my name is Nikos')}`);
};

console.log(`@mastra/core ${(await import('@mastra/core/package.json', { with: { type: 'json' } })).default.version}\n`);
await run(8000);
await run(16000);
