'use client'

import { useChat, type Message, experimental_useAssistant as useAssistant} from 'ai/react'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'react-hot-toast'

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

const roleToColorMap: Record<Message['role'], string> = {
  system: 'red',
  user: 'black',
  function: 'blue',
  assistant: 'green',
  data: 'orange',
  tool: 'yellow'
};
 

// export function Chat({ id, initialMessages, className }: ChatProps) {
//   const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
//     'ai-token',
//     null
//   )
//   const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
//   const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
//   const { messages, append, reload, stop, isLoading, input, setInput } = 
//     useChat({
//       initialMessages,
//       id,
//       body: {
//         id,
//         previewToken
//       },
//       onResponse(response) {
//         if (response.status === 401) {
//           toast.error(response.statusText)
//         }
//       }
//     })
//   return (
//     <>
//       <div className={cn('pb-[200px] pt-4 md:pt-10', className)}>
//         {messages.length ? (
//           <>
//             <ChatList messages={messages} />
//             <ChatScrollAnchor trackVisibility={isLoading} />
//           </>
//         ) : (
//           <EmptyScreen setInput={setInput} />
//         )}
//       </div>
//       <ChatPanel
//         id={id}
//         isLoading={isLoading}
//         stop={stop}
//         append={append}
//         reload={reload}
//         messages={messages}
//         input={input}
//         setInput={setInput}
//       />

//       <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Enter your OpenAI Key</DialogTitle>
//             <DialogDescription>
//               If you have not obtained your OpenAI API key, you can do so by{' '}
//               <a
//                 href="https://platform.openai.com/signup/"
//                 className="underline"
//               >
//                 signing up
//               </a>{' '}
//               on the OpenAI website. This is only necessary for preview
//               environments so that the open source community can test the app.
//               The token will be saved to your browser&apos;s local storage under
//               the name <code className="font-mono">ai-token</code>.
//             </DialogDescription>
//           </DialogHeader>
//           <Input
//             value={previewTokenInput}
//             placeholder="OpenAI API key"
//             onChange={e => setPreviewTokenInput(e.target.value)}
//           />
//           <DialogFooter className="items-center">
//             <Button
//               onClick={() => {
//                 setPreviewToken(previewTokenInput)
//                 setPreviewTokenDialog(false)
//               }}
//             >
//               Save Token
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   )
// }

export function Chat() {
  const { status, messages, input, submitMessage, handleInputChange } =
    useAssistant({ api: '/api/chat' });
 
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map((m: Message) => (
        <div
          key={m.id}
          className="whitespace-pre-wrap"
          style={{ color: roleToColorMap[m.role] }}
        >
          <strong>{`${m.role}: `}</strong>
          {m.role !== 'data' && m.content}
          {m.role === 'data' && (
            <>
              {/* here you would provide a custom display for your app-specific data:*/}
              {(m.data as any).description}
              <br />
              <pre className={'bg-gray-200'}>
                {JSON.stringify(m.data, null, 2)}
              </pre>
            </>
          )}
          <br />
          <br />
        </div>
      ))}
 
      {status === 'in_progress' && (
        <div className="h-8 w-full max-w-md p-2 mb-8 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse" />
      )}
 
      <form onSubmit={submitMessage}>
        <input
          disabled={status !== 'awaiting_message'}
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="What is the temperature in the living room?"
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}
