import 'server-only'
import { OpenAIStream, StreamingTextResponse, experimental_AssistantResponse } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';
import { MessageContentText } from 'openai/resources/beta/threads/messages/messages';
import OpenAI from 'openai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'

export const runtime = 'edge'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})

// const openai = new OpenAIApi(configuration)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// export async function POST(req: Request) {
//   const cookieStore = cookies()
//   const supabase = createRouteHandlerClient<Database>({
//     cookies: () => cookieStore
//   })
//   const json = await req.json()
//   const { messages, previewToken } = json
//   const userId = (await auth({ cookieStore }))?.user.id

//   console.log(req);
//   if (!userId) {
//     return new Response('Unauthorized', {
//       status: 401
//     })
//   }

//   if (previewToken) {
//     configuration.apiKey = previewToken
//   }

//   const res = await openai.createChatCompletion({
//     model: 'gpt-3.5-turbo',
//     messages,
//     temperature: 0.7,
//     stream: true
//   })

//   const stream = OpenAIStream(res, {
//     async onCompletion(completion) {
//       const title = json.messages[0].content.substring(0, 100)
//       const id = json.id ?? nanoid()
//       const createdAt = Date.now()
//       const path = `/chat/${id}`
//       const payload = {
//         id,
//         title,
//         userId,
//         createdAt,
//         path,
//         messages: [
//           ...messages,
//           {
//             content: completion,
//             role: 'assistant'
//           }
//         ]
//       }
//       // Insert chat into database.
//       await supabase.from('chats').upsert({ id, payload }).throwOnError()
//     }
//   })

//   return new StreamingTextResponse(stream)
// }


export async function POST(req: Request) {
  console.log(req);
  // Parse the request body
  const input: {
    threadId: string | null;
    message: string;
  } = await req.json();
 
  // Create a thread if needed
  const threadId = input.threadId ?? (await openai.beta.threads.create({})).id;

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore
  })
 
  // Add a message to the thread
  const createdMessage = await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: input.message,
  });
 
  const response = experimental_AssistantResponse(
    { threadId, messageId: createdMessage.id },
    async ({ threadId, sendMessage, sendDataMessage }: any) => {
      // Run the assistant on the thread
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id:
          process.env.ASSISTANT_ID ??
          (() => {
            throw new Error('ASSISTANT_ID is not set');
          })(),
      });
 
      async function waitForRun(run: OpenAI.Beta.Threads.Runs.Run) {
        // Poll for status change
        while (run.status === 'queued' || run.status === 'in_progress') {
          // delay for 500ms:
          await new Promise(resolve => setTimeout(resolve, 500));
 
          run = await openai.beta.threads.runs.retrieve(threadId!, run.id);
        }
 
        // Check the run status
        if (
          run.status === 'cancelled' ||
          run.status === 'cancelling' ||
          run.status === 'failed' ||
          run.status === 'expired'
        ) {
          throw new Error(run.status);
        }
 
        if (run.status === 'requires_action') {
          if (run.required_action?.type === 'submit_tool_outputs') {
            const tool_outputs =
              run.required_action.submit_tool_outputs.tool_calls.map(
                (toolCall: any) => {
                  const parameters = JSON.parse(toolCall.function.arguments);
 
                  return {
                    tool_call_id: toolCall.id,
                    output: parameters.toString(),
                  };
                },
              );
 
            run = await openai.beta.threads.runs.submitToolOutputs(
              threadId!,
              run.id,
              { tool_outputs },
            );
 
            await waitForRun(run);
          }
        }
      }
 
      await waitForRun(run);
 
      // Get new thread messages (after our message)
      const responseMessages = (
        await openai.beta.threads.messages.list(threadId, {
          after: createdMessage.id,
          order: 'asc',
        })
      ).data;
 
      // Send the messages
      for (const message of responseMessages) {
        sendMessage({
          id: message.id,
          role: 'assistant',
          content: message.content.filter(
            (content: any) => content.type === 'text',
          ) as Array<MessageContentText>,
        });
      }
    },
  );
  return response;
}

