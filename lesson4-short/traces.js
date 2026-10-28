/* Step-by-step traces for the event loop / memory visualizer.
   A slide shows one with <div data-trace="name"></div>.

   Each trace has:
     code    the program, shown on the left (lines are numbered from 1)
     panels  which boxes to draw: stack, heap, apis, micro, tasks, console
     steps   what the machine looks like after each step

   A step only lists what changed; everything else carries over from the step
   before. `line` (the highlighted line) and `log` (a line printed to the console)
   don't carry over.
     stack   frames, bottom first: "name" or { fn: "name", vars: { x: "1" } }
     heap    objects: { id: "0x01", kind: "Object", rows: [["score", "10"]], gc: true }
             values that start with "→" are drawn as references
     apis / micro / tasks   lists of strings
     phase   sync | micro | task | idle | done (the coloured tag under the code)
     note    what to say about this step (HTML allowed) */
window.TRACES = {

  /* ---------------- 02 · Memory ---------------- */
  calls: {
    panels: ['stack', 'console'],
    code: `function square(n) {
  return n * n;
}

function sumOfSquares(a, b) {
  const x = square(a);
  const y = square(b);
  return x + y;
}

const total = sumOfSquares(3, 4);
console.log(total);`,
    steps: [
      { phase: 'idle', stack: [], note: 'Nothing has run yet. <b>Predict:</b> how many frames tall does the stack get at its highest?' },
      { line: 11, phase: 'sync', stack: [{ fn: 'global', vars: { total: '…' } }], note: 'The script starts. The <b>global frame</b> goes on the stack. It holds the top-level variables.' },
      { line: 5, stack: [{ fn: 'global', vars: { total: '…' } }, { fn: 'sumOfSquares', vars: { a: '3', b: '4', x: '…', y: '…' } }], note: 'Calling a function <b>pushes a frame</b>: a fresh box holding that call\'s own <code>a</code>, <code>b</code>, <code>x</code>, <code>y</code>.' },
      { line: 6, stack: [{ fn: 'global', vars: { total: '…' } }, { fn: 'sumOfSquares', vars: { a: '3', b: '4', x: '…', y: '…' } }, { fn: 'square', vars: { n: '3' } }], note: '<code>square(3)</code> pushes another frame on top. Three deep. Only the <b>top</b> frame is running; the others are paused, waiting for an answer.' },
      { line: 2, note: '<code>return 9</code>. The frame is <b>popped</b> and thrown away: this <code>n</code> is gone for good.' },
      { line: 6, stack: [{ fn: 'global', vars: { total: '…' } }, { fn: 'sumOfSquares', vars: { a: '3', b: '4', x: '9', y: '…' } }], note: 'Back in <code>sumOfSquares</code>, right where it paused. <code>x</code> is 9.' },
      { line: 7, stack: [{ fn: 'global', vars: { total: '…' } }, { fn: 'sumOfSquares', vars: { a: '3', b: '4', x: '9', y: '…' } }, { fn: 'square', vars: { n: '4' } }], note: 'A <b>brand new</b> frame for <code>square(4)</code>. It doesn\'t remember the last call\'s <code>n</code>.' },
      { line: 7, stack: [{ fn: 'global', vars: { total: '…' } }, { fn: 'sumOfSquares', vars: { a: '3', b: '4', x: '9', y: '16' } }], note: 'Returns 16, frame popped.' },
      { line: 11, stack: [{ fn: 'global', vars: { total: '25' } }], note: '<code>sumOfSquares</code> returns 25 and its frame pops too.' },
      { line: 12, stack: [{ fn: 'global', vars: { total: '25' } }, 'console.log'], log: '25', note: 'Even <code>console.log</code> is a function call: push, print, pop.' },
      { phase: 'done', stack: [], note: 'The stack is <b>empty</b>. Remember this moment: the browser can only do other work (clicks, timers, network replies) when the stack is empty. Answer: <b>3 frames</b>.' }
    ]
  },

  refs: {
    panels: ['stack', 'heap', 'console'],
    code: `let a = 10;
let b = a;
b = b + 1;

const p = { score: 10 };
const q = p;
q.score = 99;

console.log(a, b, p.score);`,
    steps: [
      { phase: 'idle', stack: [], heap: [], note: '<b>Predict:</b> what are the three numbers printed on line 9?' },
      { line: 1, phase: 'sync', stack: [{ fn: 'global', vars: { a: '10' } }], note: 'Numbers, strings, and booleans are <b>primitives</b>. The value sits right in the variable\'s slot.' },
      { line: 2, stack: [{ fn: 'global', vars: { a: '10', b: '10' } }], note: '<code>b = a</code> <b>copies the value</b>. Two separate 10s.' },
      { line: 3, stack: [{ fn: 'global', vars: { a: '10', b: '11' } }], note: 'Changing <code>b</code> can\'t touch <code>a</code>. They were never connected.' },
      { line: 5, stack: [{ fn: 'global', vars: { a: '10', b: '11', p: '→ 0x01' } }], heap: [{ id: '0x01', kind: 'Object', rows: [['score', '10']] }], note: 'Objects (and arrays, and functions) live on the <b>heap</b>. The variable holds only the object\'s <b>address</b>, a reference.' },
      { line: 6, stack: [{ fn: 'global', vars: { a: '10', b: '11', p: '→ 0x01', q: '→ 0x01' } }], note: '<code>q = p</code> copies the <b>address</b>, not the object. One object, two arrows pointing at it.' },
      { line: 7, heap: [{ id: '0x01', kind: 'Object', rows: [['score', '99']] }], note: 'Follow <code>q</code>\'s arrow and change the object. <code>p</code> points at the <b>same</b> object.' },
      { line: 9, phase: 'done', stack: [{ fn: 'global', vars: { a: '10', b: '11', p: '→ 0x01', q: '→ 0x01' } }, 'console.log'], log: '10 11 99', note: '<b>10 11 99.</b> Primitives are copied; objects are shared. This is also why <code>const p</code> can still change: the arrow is constant, the object isn\'t.' }
    ]
  },

  closure: {
    panels: ['stack', 'heap', 'console'],
    code: `function makeCounter() {
  let count = 0;
  return function () {
    count = count + 1;
    return count;
  };
}

let next = makeCounter();
console.log(next());
console.log(next());
next = null;`,
    steps: [
      { phase: 'idle', stack: [], heap: [], note: '<b>Predict:</b> <code>makeCounter</code> has finished by line 10. Where is <code>count</code> kept? What prints?' },
      { line: 9, phase: 'sync', stack: [{ fn: 'global', vars: { next: '…' } }], note: 'Line 9 calls <code>makeCounter()</code>.' },
      { line: 2, stack: [{ fn: 'global', vars: { next: '…' } }, 'makeCounter'], heap: [{ id: 'S1', kind: 'scope', rows: [['count', '0']] }], note: 'An inner function uses <code>count</code>, so the engine keeps <code>count</code> in a <b>scope object on the heap</b>, not just in the frame.' },
      { line: 3, heap: [{ id: 'S1', kind: 'scope', rows: [['count', '0']] }, { id: 'F1', kind: 'function', rows: [['scope', '→ S1']] }], note: 'Making the inner function puts a function object on the heap. It carries a hidden arrow to the scope it was born in.' },
      { line: 9, stack: [{ fn: 'global', vars: { next: '→ F1' } }], note: '<code>makeCounter</code> returns and its frame <b>pops</b>. But <code>count</code> survives: <code>next → F1 → S1</code>. That chain is a <b>closure</b>.' },
      { line: 4, stack: [{ fn: 'global', vars: { next: '→ F1' } }, 'next()'], heap: [{ id: 'S1', kind: 'scope', rows: [['count', '1']] }, { id: 'F1', kind: 'function', rows: [['scope', '→ S1']] }], note: 'Calling <code>next()</code> follows the arrow to S1 and updates <code>count</code> there.' },
      { line: 10, stack: [{ fn: 'global', vars: { next: '→ F1' } }], log: '1', note: 'Prints 1.' },
      { line: 11, heap: [{ id: 'S1', kind: 'scope', rows: [['count', '2']] }, { id: 'F1', kind: 'function', rows: [['scope', '→ S1']] }], log: '2', note: 'Same S1, so the count keeps going: 2.' },
      { line: 12, phase: 'done', stack: [{ fn: 'global', vars: { next: 'null' } }], heap: [{ id: 'S1', kind: 'scope', rows: [['count', '2']], gc: true }, { id: 'F1', kind: 'function', rows: [['scope', '→ S1']], gc: true }], note: 'No variable leads to F1 any more, so F1 and S1 are <b>unreachable</b>. The <b>garbage collector</b> frees them later. You never call <code>free()</code> in JS.' }
    ]
  },

  /* ---------------- 03 · Event loop ---------------- */
  timeout0: {
    panels: ['stack', 'apis', 'tasks', 'console'],
    code: `console.log("A");

setTimeout(() => {
  console.log("B");
}, 0);

console.log("C");`,
    steps: [
      { phase: 'idle', stack: [], apis: [], tasks: [], note: '<b>Predict:</b> the timer is <b>0 ms</b>. What order do A, B, C print in?' },
      { line: 1, phase: 'sync', stack: ['script', 'console.log("A")'], log: 'A', note: 'The whole script runs as <b>one task</b>. Line 1 prints A.' },
      { line: 3, stack: ['script', 'setTimeout'], apis: ['⏱ timer 0 ms → callback B'], note: '<code>setTimeout</code> isn\'t part of JavaScript. It\'s a <b>browser API</b>: it hands the callback to the browser\'s timer and <b>returns straight away</b>.' },
      { line: 3, stack: ['script'], apis: [], tasks: ['callback B'], note: 'The 0 ms timer is done at once, so the browser puts the callback in the <b>task queue</b>. It has to wait: the stack is still busy with our script.' },
      { line: 7, stack: ['script', 'console.log("C")'], log: 'C', note: 'The script keeps going. C prints <b>before</b> B.' },
      { phase: 'idle', stack: [], note: 'Script finished, stack empty. The <b>event loop</b> now takes the oldest task from the queue.' },
      { line: 4, phase: 'task', stack: ['callback B', 'console.log("B")'], tasks: [], log: 'B', note: 'Only now does B run.' },
      { phase: 'done', stack: [], note: '<b>A C B.</b> “0 ms” means “as soon as possible <i>after</i> the current code finishes”, never “right now”.' }
    ]
  },

  varloop: {
    panels: ['stack', 'heap', 'tasks', 'console'],
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(i);
  }, 0);
}`,
    steps: [
      { phase: 'idle', stack: [], heap: [], tasks: [], note: '<b>Predict:</b> three timers, three logs of <code>i</code>. What prints?' },
      { line: 1, phase: 'sync', stack: ['script'], heap: [{ id: 'S', kind: 'scope', rows: [['i', '0']] }], note: '<code>var</code> makes <b>one</b> <code>i</code> for the whole script. The callbacks will use it, so it lives on the heap.' },
      { line: 2, heap: [{ id: 'S', kind: 'scope', rows: [['i', '0']] }, { id: 'F1', kind: 'callback', rows: [['scope', '→ S']] }], tasks: ['F1'], note: 'The first callback is created and queued (skipping the timer stop: 0 ms). It holds an arrow to <code>S</code>, <b>not</b> a copy of the 0.' },
      { line: 2, heap: [{ id: 'S', kind: 'scope', rows: [['i', '1']] }, { id: 'F1', kind: 'callback', rows: [['scope', '→ S']] }, { id: 'F2', kind: 'callback', rows: [['scope', '→ S']] }], tasks: ['F1', 'F2'], note: '<code>i++</code> changes the <b>same</b> <code>i</code>. A second callback, pointing at the same scope.' },
      { line: 2, heap: [{ id: 'S', kind: 'scope', rows: [['i', '2']] }, { id: 'F1', kind: 'callback', rows: [['scope', '→ S']] }, { id: 'F2', kind: 'callback', rows: [['scope', '→ S']] }, { id: 'F3', kind: 'callback', rows: [['scope', '→ S']] }], tasks: ['F1', 'F2', 'F3'], note: 'And a third.' },
      { line: 1, heap: [{ id: 'S', kind: 'scope', rows: [['i', '3']] }, { id: 'F1', kind: 'callback', rows: [['scope', '→ S']] }, { id: 'F2', kind: 'callback', rows: [['scope', '→ S']] }, { id: 'F3', kind: 'callback', rows: [['scope', '→ S']] }], note: '<code>i++</code> makes it 3, <code>3 &lt; 3</code> is false, and the loop ends. <b>Not one callback has run yet.</b>' },
      { phase: 'idle', stack: [], note: 'Script done, so the event loop starts on the queue.' },
      { line: 3, phase: 'task', stack: ['F1'], tasks: ['F2', 'F3'], log: '3', note: 'F1 follows its arrow to <code>S</code> and reads <code>i</code>, which is 3 <b>now</b>.' },
      { line: 3, stack: ['F2'], tasks: ['F3'], log: '3', note: 'Same scope, same <code>i</code>.' },
      { line: 3, stack: ['F3'], tasks: [], log: '3' },
      { phase: 'done', stack: [], note: '<b>3 3 3.</b> Callbacks read a variable <b>when they run</b>, not when they were made, and here all three share one variable.' }
    ]
  },

  letloop: {
    panels: ['stack', 'heap', 'tasks', 'console'],
    code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(i);
  }, 0);
}`,
    steps: [
      { phase: 'idle', stack: [], heap: [], tasks: [], note: 'One word changed: <code>var</code> → <code>let</code>. <b>Predict</b> again.' },
      { line: 2, phase: 'sync', stack: ['script'], heap: [{ id: 'S0', kind: 'loop scope', rows: [['i', '0']] }, { id: 'F1', kind: 'callback', rows: [['scope', '→ S0']] }], tasks: ['F1'], note: 'With <code>let</code>, <b>every pass of the loop gets its own scope</b> with its own <code>i</code>.' },
      { line: 2, heap: [{ id: 'S0', kind: 'loop scope', rows: [['i', '0']] }, { id: 'S1', kind: 'loop scope', rows: [['i', '1']] }, { id: 'F1', kind: 'callback', rows: [['scope', '→ S0']] }, { id: 'F2', kind: 'callback', rows: [['scope', '→ S1']] }], tasks: ['F1', 'F2'], note: 'A new scope S1 starts at 1. F2 points at S1.' },
      { line: 2, heap: [{ id: 'S0', kind: 'loop scope', rows: [['i', '0']] }, { id: 'S1', kind: 'loop scope', rows: [['i', '1']] }, { id: 'S2', kind: 'loop scope', rows: [['i', '2']] }, { id: 'F1', kind: 'callback', rows: [['scope', '→ S0']] }, { id: 'F2', kind: 'callback', rows: [['scope', '→ S1']] }, { id: 'F3', kind: 'callback', rows: [['scope', '→ S2']] }], tasks: ['F1', 'F2', 'F3'], note: 'Three scopes, three arrows.' },
      { line: 3, phase: 'task', stack: ['F1'], tasks: ['F2', 'F3'], log: '0', note: 'F1 reads S0\'s <code>i</code>.' },
      { line: 3, stack: ['F2'], tasks: ['F3'], log: '1' },
      { line: 3, stack: ['F3'], tasks: [], log: '2' },
      { phase: 'done', stack: [], note: '<b>0 1 2.</b> Same timing as before. The only difference is <b>how many variables exist in memory</b>.' }
    ]
  },

  /* ---------------- 04 · Promises ---------------- */
  executor: {
    panels: ['stack', 'heap', 'micro', 'console'],
    code: `const p = new Promise((resolve) => {
  console.log("A");
  resolve("done");
});

p.then((value) => {
  console.log("B", value);
});

console.log("C");`,
    steps: [
      { phase: 'idle', stack: [], heap: [], micro: [], note: '<b>Predict:</b> is the function passed to <code>new Promise</code> run now or later? What order?' },
      { line: 1, phase: 'sync', stack: ['script', 'new Promise'], heap: [{ id: 'P1', kind: 'Promise', rows: [['state', 'pending'], ['value', '—'], ['reactions', '[]']] }], note: '<code>new Promise</code> makes a promise object on the heap: a <b>state</b>, a <b>value</b>, and a list of callbacks waiting for it.' },
      { line: 2, stack: ['script', 'new Promise', 'executor'], log: 'A', note: 'The function you pass in (the <b>executor</b>) runs <b>immediately</b>, while you wait. A prints first.' },
      { line: 3, heap: [{ id: 'P1', kind: 'Promise', rows: [['state', 'fulfilled'], ['value', '"done"'], ['reactions', '[]']] }], note: '<code>resolve("done")</code> settles the promise: <b>fulfilled</b> with value <code>"done"</code>. A promise settles at most once.' },
      { line: 6, stack: ['script', 'p.then'], micro: ['(value) => … with "done"'], note: '<code>p</code> is already fulfilled, so <code>.then</code> puts the callback straight into the <b>microtask queue</b>. Even a finished promise <b>never</b> runs <code>.then</code> callbacks right away.' },
      { line: 10, stack: ['script', 'console.log("C")'], log: 'C', note: 'The script carries on: C.' },
      { phase: 'micro', stack: [], note: 'Stack empty, so the event loop runs the <b>microtasks</b>.' },
      { line: 7, stack: ['(value) => …', 'console.log'], micro: [], log: 'B done', note: 'B, with the value we resolved with.' },
      { phase: 'done', stack: [], note: '<b>A C B done.</b> The executor is synchronous. Only <code>.then</code> callbacks wait.' }
    ]
  },

  promiseVsTimeout: {
    panels: ['stack', 'apis', 'micro', 'tasks', 'console'],
    code: `console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => console.log("3"));

console.log("4");`,
    steps: [
      { phase: 'idle', stack: [], apis: [], micro: [], tasks: [], note: '<b>Predict:</b> a 0 ms timer and an already-resolved promise. Which callback wins?' },
      { line: 1, phase: 'sync', stack: ['script', 'console.log'], log: '1', note: 'Synchronous: 1.' },
      { line: 3, stack: ['script', 'setTimeout'], apis: ['⏱ timer 0 ms → log "2"'], note: 'The timer goes to the browser…' },
      { line: 3, stack: ['script'], apis: [], tasks: ['log "2"'], note: '…and when it\'s done, the callback joins the <b>task queue</b>.' },
      { line: 5, stack: ['script', 'then'], micro: ['log "3"'], note: '<code>Promise.resolve()</code> is already fulfilled, so <code>.then</code> queues its callback in the <b>microtask queue</b>. That\'s a different line, with priority.' },
      { line: 7, stack: ['script', 'console.log'], log: '4', note: 'Synchronous: 4.' },
      { phase: 'micro', stack: [], note: 'The script task is finished. <b>Rule: after every task, run ALL the microtasks</b>, before any other task.' },
      { line: 5, stack: ['() => log "3"'], micro: [], log: '3', note: 'The microtask: 3.' },
      { phase: 'task', stack: [], note: 'No microtasks left. <b>Now</b> the event loop can take the next task.' },
      { line: 3, stack: ['() => log "2"'], tasks: [], log: '2', note: 'The timer callback, finally: 2.' },
      { phase: 'done', stack: [], note: '<b>1 4 3 2.</b> Synchronous code first, then microtasks (promises), then tasks (timers, clicks, network events).' }
    ]
  },

  chains: {
    panels: ['stack', 'heap', 'micro', 'console'],
    code: `Promise.resolve()
  .then(() => console.log("a1"))
  .then(() => console.log("a2"));

Promise.resolve()
  .then(() => console.log("b1"))
  .then(() => console.log("b2"));`,
    steps: [
      { phase: 'idle', stack: [], heap: [], micro: [], note: '<b>Predict:</b> does chain A finish before chain B starts?' },
      { line: 2, phase: 'sync', stack: ['script'], heap: [{ id: 'A', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'A1', kind: 'Promise', rows: [['state', 'pending'], ['reactions', '[]']] }], micro: ['a1'], note: '<code>A</code> is already fulfilled, so <code>a1</code> is queued. <b><code>.then</code> returns a NEW promise</b>, A1, which stays pending until <code>a1</code> has run.' },
      { line: 3, heap: [{ id: 'A', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'A1', kind: 'Promise', rows: [['state', 'pending'], ['reactions', '[a2]']] }], note: 'A1 is pending, so <code>a2</code> is <b>not</b> queued. It waits in A1\'s reaction list on the heap.' },
      { line: 6, heap: [{ id: 'A', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'A1', kind: 'Promise', rows: [['state', 'pending'], ['reactions', '[a2]']] }, { id: 'B', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'B1', kind: 'Promise', rows: [['state', 'pending'], ['reactions', '[]']] }], micro: ['a1', 'b1'], note: 'Same for chain B: <code>b1</code> joins the queue behind <code>a1</code>.' },
      { line: 7, heap: [{ id: 'A', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'A1', kind: 'Promise', rows: [['state', 'pending'], ['reactions', '[a2]']] }, { id: 'B', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'B1', kind: 'Promise', rows: [['state', 'pending'], ['reactions', '[b2]']] }], note: '<code>b2</code> waits inside B1.' },
      { line: 2, phase: 'micro', stack: ['a1'], heap: [{ id: 'A', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'A1', kind: 'Promise', rows: [['state', 'fulfilled'], ['reactions', '[]']] }, { id: 'B', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'B1', kind: 'Promise', rows: [['state', 'pending'], ['reactions', '[b2]']] }], micro: ['b1', 'a2'], log: 'a1', note: '<code>a1</code> runs, so A1 is fulfilled, and its reaction <code>a2</code> joins the <b>back</b> of the queue, behind <code>b1</code>.' },
      { line: 6, stack: ['b1'], heap: [{ id: 'A', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'A1', kind: 'Promise', rows: [['state', 'fulfilled'], ['reactions', '[]']] }, { id: 'B', kind: 'Promise', rows: [['state', 'fulfilled']] }, { id: 'B1', kind: 'Promise', rows: [['state', 'fulfilled'], ['reactions', '[]']] }], micro: ['a2', 'b2'], log: 'b1', note: '<code>b1</code> runs, and <code>b2</code> is queued behind <code>a2</code>.' },
      { line: 3, stack: ['a2'], micro: ['b2'], log: 'a2' },
      { line: 7, stack: ['b2'], micro: [], log: 'b2' },
      { phase: 'done', stack: [], note: '<b>a1 b1 a2 b2.</b> The chains take turns, one link each. A link is queued only when the one before it finishes.' }
    ]
  },

  /* ---------------- 05 · async / await ---------------- */
  await: {
    panels: ['stack', 'heap', 'micro', 'console'],
    code: `async function load() {
  console.log("load: start");
  await null;
  console.log("load: done");
}

console.log("script: start");
load();
console.log("script: end");`,
    steps: [
      { phase: 'idle', stack: [], heap: [], micro: [], note: '<b>Predict:</b> four lines. Does <code>await</code> pause the whole program, or just <code>load</code>?' },
      { line: 7, phase: 'sync', stack: ['script', 'console.log'], log: 'script: start' },
      { line: 2, stack: ['script', 'load'], heap: [{ id: 'P', kind: 'Promise', rows: [['state', 'pending'], ['from', 'load()']] }], log: 'load: start', note: 'An <code>async</code> function runs <b>synchronously until its first <code>await</code></b>. Calling it also makes the promise it will return.' },
      { line: 3, stack: ['script'], heap: [{ id: 'P', kind: 'Promise', rows: [['state', 'pending'], ['from', 'load()']] }, { id: 'L', kind: 'paused frame', rows: [['fn', 'load'], ['resume', 'line 4']] }], micro: ['resume load()'], note: '<code>await</code> <b>pauses only <code>load</code></b>. Its frame is saved to the <b>heap</b> (so local variables survive), popped off the stack, and “the rest of load” is queued as a microtask.' },
      { line: 9, stack: ['script', 'console.log'], log: 'script: end', note: 'The caller carries on. <code>load()</code> already handed back a pending promise.' },
      { line: 4, phase: 'micro', stack: ['load (resumed)'], heap: [{ id: 'P', kind: 'Promise', rows: [['state', 'pending'], ['from', 'load()']] }], micro: [], log: 'load: done', note: 'Stack empty, so microtasks run: the frame comes back from the heap and <code>load</code> continues on line 4.' },
      { phase: 'done', stack: [], heap: [{ id: 'P', kind: 'Promise', rows: [['state', 'fulfilled'], ['from', 'load()']] }], note: '<code>load</code> returns, so its promise is fulfilled. <b>script: start → load: start → script: end → load: done.</b>' }
    ]
  },

  boss: {
    panels: ['stack', 'micro', 'tasks', 'console'],
    code: `console.log("1");

setTimeout(() => console.log("2"), 0);

async function run() {
  console.log("3");
  await null;
  console.log("4");
}

run();
Promise.resolve().then(() => console.log("5"));
console.log("6");`,
    steps: [
      { phase: 'idle', stack: [], micro: [], tasks: [], note: '<b>The final boss.</b> Six logs. Write your answer down before anyone speaks.' },
      { line: 1, phase: 'sync', stack: ['script', 'console.log'], log: '1', note: 'Synchronous.' },
      { line: 3, stack: ['script'], tasks: ['log "2"'], note: 'Timer, so the <b>task</b> queue (skipping the Web API stop).' },
      { line: 6, stack: ['script', 'run'], log: '3', note: '<code>run()</code> on line 11: synchronous until the first <code>await</code>.' },
      { line: 7, stack: ['script'], micro: ['resume run()'], note: '<code>await</code>: <code>run</code> pauses, and its continuation goes to the <b>microtask</b> queue.' },
      { line: 12, micro: ['resume run()', 'log "5"'], note: 'An already-resolved promise: <b>microtask</b>, behind <code>run</code>\'s continuation.' },
      { line: 13, stack: ['script', 'console.log'], log: '6', note: 'Last synchronous line.' },
      { line: 8, phase: 'micro', stack: ['run (resumed)'], micro: ['log "5"'], log: '4', note: 'All microtasks, in order: <code>run</code> resumes first…' },
      { line: 12, stack: ['() => log "5"'], micro: [], log: '5', note: '…then the <code>.then</code> callback.' },
      { line: 3, phase: 'task', stack: ['() => log "2"'], tasks: [], log: '2', note: 'Microtasks empty, so <b>now</b> the timer task.' },
      { phase: 'done', stack: [], note: '<b>1 3 6 4 5 2.</b> Synchronous → microtasks in the order they were queued → tasks.' }
    ]
  },

  /* ---------------- 07 · fetch ---------------- */
  fetch: {
    panels: ['stack', 'apis', 'micro', 'console'],
    code: `console.log("start");

fetch("https://pokeapi.co/api/v2/pokemon/pikachu")
  .then((res) => res.json())
  .then((data) => console.log(data.name));

console.log("end");`,
    steps: [
      { phase: 'idle', stack: [], apis: [], micro: [], note: '<b>Predict:</b> the order of the three logs. While we wait for the server, can the user still click things?' },
      { line: 1, phase: 'sync', stack: ['script', 'console.log'], log: 'start' },
      { line: 3, stack: ['script', 'fetch'], apis: ['🌐 GET /pokemon/pikachu … waiting'], note: '<code>fetch</code> is a browser API. It hands the request to the <b>network layer</b> and <b>immediately</b> returns a pending promise.' },
      { line: 5, stack: ['script'], note: 'Both <code>.then</code>s just <b>register</b> callbacks on pending promises. Nothing is queued yet: there is no answer to react to.' },
      { line: 7, stack: ['script', 'console.log'], log: 'end' },
      { phase: 'idle', stack: [], note: 'Script done. <b>The stack is empty while we wait</b>, for 50, 200, maybe 2000 ms. Clicks, scrolling, and animations all keep working. This is the whole point.' },
      { line: 4, phase: 'micro', apis: [], micro: ['(res) => res.json()'], note: 'The server\'s <b>status and headers</b> arrive. The browser fulfils the fetch promise with a <code>Response</code>, and our first callback is queued.' },
      { line: 4, stack: ['(res) => res.json()'], micro: [], apis: ['🌐 reading the body…'], note: '<code>res.json()</code> starts reading the <b>body</b>, which may still be arriving. Another async step, so it returns another promise.' },
      { line: 5, stack: [], apis: [], micro: ['(data) => log(data.name)'], note: 'The body is fully downloaded and parsed from JSON text into an object.' },
      { line: 5, stack: ['(data) => …', 'console.log'], micro: [], log: 'pikachu' },
      { phase: 'done', stack: [], note: '<b>start → end → pikachu.</b> Two async steps: headers first, then the body.' }
    ]
  }
};
