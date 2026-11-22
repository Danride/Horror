// Exercise the actual bundled VK Bridge against a local simulated VK iframe.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sdkAndHost = html.match(/<script>([\s\S]*?)<\/script>/)[1];

async function boot(search, response, native=false){
  const listeners = new Map();
  const sent = [];
  const emitted = [];
  const window = {
    location: {search},
    addEventListener(type, handler){
      if(!listeners.has(type))listeners.set(type,[]);
      listeners.get(type).push(handler);
    },
    dispatchEvent(event){
      emitted.push(event.type);
      for(const handler of listeners.get(event.type)||[])handler(event);
    }
  };
  const parent = {
    postMessage(message){
      sent.push(message);
      queueMicrotask(()=>window.dispatchEvent({type:'message',data:{type:response?'VKWebAppInitResult':'VKWebAppInitFailed',data:{request_id:message.params.request_id,...(response?{result:true}:{error_type:'client_error',error_data:{error_reason:'test rejection'}})}}}));
    }
  };
  if(native)window.AndroidBridge={VKWebAppInit(raw){const params=JSON.parse(raw);sent.push({handler:'VKWebAppInit',params});queueMicrotask(()=>window.dispatchEvent({type:'VKWebAppEvent',detail:{type:'VKWebAppInitResult',data:{request_id:params.request_id,result:true}}}));}};
  window.parent=search?parent:window;
  vm.runInNewContext(sdkAndHost,{window,parent:window.parent,location:window.location,navigator:{userAgent:'test browser'},URLSearchParams,URL,Event,setTimeout,clearTimeout,console});
  await new Promise(resolve=>setImmediate(resolve));
  return {window,sent,emitted};
}

(async()=>{
  const success=await boot('?vk_app_id=123&vk_platform=desktop_web',true);
  assert.equal(success.sent.length,1);
  assert.equal(success.sent[0].handler,'VKWebAppInit');
  assert.equal(success.window.palataVkHost.status,'connected');
  success.window.dispatchEvent({type:'message',data:{type:'VKWebAppViewHide',data:{}}});
  assert.ok(success.emitted.includes('palata:vk-hide'));
  const failure=await boot('?vk_app_id=123&vk_platform=mobile_web',false);
  assert.equal(failure.window.palataVkHost.status,'error');
  const standalone=await boot('',true);
  assert.equal(standalone.sent.length,0);
  assert.equal(standalone.window.palataVkHost.status,'standalone');
  const native=await boot('',true,true);
  assert.equal(native.sent[0].handler,'VKWebAppInit');
  assert.equal(native.window.palataVkHost.status,'connected');
  console.log('VK Bridge actual SDK: iframe and native initialization, response, rejection and view-hide event verified.');
})().catch(error=>{console.error(error);process.exitCode=1;});
