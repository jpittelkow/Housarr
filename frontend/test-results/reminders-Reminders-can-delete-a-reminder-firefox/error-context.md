# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:esbuild] Transform failed with 1 error: C:/Users/jpitt_6932a9v/code/Housarr/frontend/src/stores/authStore.ts:37:304: ERROR: Expected \":\" but found \"=>\""
  - generic [ref=e5]: C:/Users/jpitt_6932a9v/code/Housarr/frontend/src/stores/authStore.ts:37:304
  - generic [ref=e6]: "Expected \":\" but found \"=>\" 35 | try { 36 | // #region agent log 37 | fetch('http://127.0.0.1:7242/ingest/17928be1-2792-458b-a965-8c59aa26a04e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authStore.ts:37','message':'Before CSRF call','data':{},'timestamp':Date.now(),sessionId:'debug-session','runId':'run1','hypothesisId'=>'D'})}).catch(()=>{}); | ^ 38 | // #endregion 39 | await auth.csrf()"
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