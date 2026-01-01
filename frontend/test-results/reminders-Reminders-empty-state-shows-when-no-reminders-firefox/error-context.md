# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:esbuild] Transform failed with 1 error: C:/Users/jpitt_6932a9v/code/Housarr/frontend/src/services/api.ts:94:190: ERROR: Expected \":\" but found \"=>\""
  - generic [ref=e5]: C:/Users/jpitt_6932a9v/code/Housarr/frontend/src/services/api.ts:94:190
  - generic [ref=e6]: "Expected \":\" but found \"=>\" 92 | const response = await api.post('/auth/login', data) 93 | // #region agent log 94 | fetch('http://127.0.0.1:7242/ingest/17928be1-2792-458b-a965-8c59aa26a04e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:91','message'=>'API login call successful','data':{status:response.status,has_user:!!response.data?.user},'timestamp':Date.now(),sessionId:'debug-session','runId':'run1','hypothesisId'=>'C'})}).catch(()=>{}); | ^ 95 | // #endregion 96 | return response.data"
  - generic [ref=e7]: at failureErrorWithLog (C:\Users\jpitt_6932a9v\code\Housarr\frontend\node_modules\esbuild\lib\main.js:1467:15) at C:\Users\jpitt_6932a9v\code\Housarr\frontend\node_modules\esbuild\lib\main.js:736:50 at responseCallbacks.<computed> (C:\Users\jpitt_6932a9v\code\Housarr\frontend\node_modules\esbuild\lib\main.js:603:9) at handleIncomingPacket (C:\Users\jpitt_6932a9v\code\Housarr\frontend\node_modules\esbuild\lib\main.js:658:12) at Socket.readFromStdout (C:\Users\jpitt_6932a9v\code\Housarr\frontend\node_modules\esbuild\lib\main.js:581:7) at Socket.emit (node:events:507:28) at addChunk (node:internal/streams/readable:559:12) at readableAddChunkPushByteMode (node:internal/streams/readable:510:3) at Readable.push (node:internal/streams/readable:390:5) at Pipe.onStreamRead (node:internal/stream_base_commons:189:23
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.ts
    - text: .
```