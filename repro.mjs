import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { TokenLimiter } from '@mastra/core/processors';
import { z } from 'zod';

const bigResult = {
    rules: Array.from({ length: 400 }, (_, i) => ({
        id: i,
        name: `Rule number ${i} boosting chairs and tables in the living room category`,
        active: true
    }))
};

const listRules = createTool({
    id: 'listRules',
    description: 'List the rules of the shop',
    inputSchema: z.object({}),
    outputSchema: z.object({ rules: z.array(z.any()) }),
    execute: async () => bigResult
});

const promptsSeenByModel = [];
let toolCallsRequested = 0;

const model = {
    specificationVersion: 'v2',
    provider: 'fake',
    modelId: 'fake',
    supportedUrls: {},
    async doGenerate({ prompt }) {
        promptsSeenByModel.push(prompt);
        const promptHasToolResult = JSON.stringify(prompt).includes('Rule number 399');
        if (!promptHasToolResult && toolCallsRequested < 3) {
            toolCallsRequested++;
            return {
                content: [{ type: 'tool-call', toolCallId: `call_${toolCallsRequested}`, toolName: 'listRules', input: '{}' }],
                finishReason: 'tool-calls',
                usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
                warnings: []
            };
        }
        return {
            content: [{ type: 'text', text: promptHasToolResult ? 'You have 400 rules.' : 'I could not read the rules.' }],
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
    promptsSeenByModel.length = 0;
    toolCallsRequested = 0;
    const agent = new Agent({
        id: 'repro',
        name: 'repro',
        instructions: 'You are helpful.',
        model,
        tools: { listRules },
        ...(limit ? { inputProcessors: [new TokenLimiter(limit)] } : {})
    });
    const result = await agent.generate('How many rules do I have?', { maxSteps: 5 });
    const toolResultReachedModel = promptsSeenByModel.slice(1).some(prompt => JSON.stringify(prompt).includes('Rule number 399'));
    console.log(`limit ${limit ?? 'none'}: model calls ${promptsSeenByModel.length}, listRules called ${toolCallsRequested}x, tool result reached the model: ${toolResultReachedModel}, final text: ${JSON.stringify(result.text)}`);
};

console.log(`@mastra/core ${(await import('@mastra/core/package.json', { with: { type: 'json' } })).default.version}\n`);
await run(2000);
await run(null);
