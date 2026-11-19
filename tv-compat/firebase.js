
window.KCFirestoreForTV=function(){((_window$KCSharedClock,_window$KCSharedTrans,_window$KCSharedSync2)=>{var ou=()=>{};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var uu=function(n){let e=[],t=0;for(let r=0;r<n.length;r++){let s=n.charCodeAt(r);s<128?e[t++]=s:s<2048?(e[t++]=s>>6|192,e[t++]=s&63|128):(s&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=s>>18|240,e[t++]=s>>12&63|128,e[t++]=s>>6&63|128,e[t++]=s&63|128):(e[t++]=s>>12|224,e[t++]=s>>6&63|128,e[t++]=s&63|128);}return e;},Ld=function(n){let e=[],t=0,r=0;for(;t<n.length;){let s=n[t++];if(s<128)e[r++]=String.fromCharCode(s);else if(s>191&&s<224){let o=n[t++];e[r++]=String.fromCharCode((s&31)<<6|o&63);}else if(s>239&&s<365){let o=n[t++],a=n[t++],c=n[t++],l=((s&7)<<18|(o&63)<<12|(a&63)<<6|c&63)-65536;e[r++]=String.fromCharCode(55296+(l>>10)),e[r++]=String.fromCharCode(56320+(l&1023));}else{let o=n[t++],a=n[t++];e[r++]=String.fromCharCode((s&15)<<12|(o&63)<<6|a&63);}}return e.join("");},lu={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/=";},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_.";},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();let t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<n.length;s+=3){let o=n[s],a=s+1<n.length,c=a?n[s+1]:0,l=s+2<n.length,h=l?n[s+2]:0,f=o>>2,p=(o&3)<<4|c>>4,g=(c&15)<<2|h>>6,T=h&63;l||(T=64,a||(g=64)),r.push(t[f],t[p],t[g],t[T]);}return r.join("");},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(uu(n),e);},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):Ld(this.decodeStringToByteArray(n,e));},decodeStringToByteArray(n,e){this.init_();let t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<n.length;){let o=t[n.charAt(s++)],c=s<n.length?t[n.charAt(s)]:0;++s;let h=s<n.length?t[n.charAt(s)]:64;++s;let p=s<n.length?t[n.charAt(s)]:64;if(++s,o==null||c==null||h==null||p==null)throw new _i();let g=o<<2|c>>4;if(r.push(g),h!==64){let T=c<<4&240|h>>2;if(r.push(T),p!==64){let C=h<<6&192|p;r.push(C);}}}return r;},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n);}}},_i=class extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError";}},Md=function(n){let e=uu(n);return lu.encodeByteArray(e,!0);},Yn=function(n){return Md(n).replace(/\./g,"");},hu=function(n){try{return lu.decodeString(n,!0);}catch(e){console.error("base64Decode failed: ",e);}return null;};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function du(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.");}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Fd=()=>du().__FIREBASE_DEFAULTS__,Bd=()=>{if(typeof process>"u"||typeof process.env>"u")return;let n=process.env.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n);},Ud=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);}catch(_unused){return;}let e=n&&hu(n[1]);return e&&JSON.parse(e);},vi=()=>{try{return ou()||Fd()||Bd()||Ud();}catch(n){console.info("Unable to get __FIREBASE_DEFAULTS__ due to: ".concat(n));return;}},Kd=n=>{var _vi;return(_vi=vi())===null||_vi===void 0||(_vi=_vi.emulatorHosts)===null||_vi===void 0?void 0:_vi[n];},fu=n=>{let e=Kd(n);if(!e)return;let t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error("Invalid host ".concat(e," with no separate hostname and port!"));let r=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),r]:[e.substring(0,t),r];},Ei=()=>{var _vi2;return(_vi2=vi())===null||_vi2===void 0?void 0:_vi2.config;};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Qr=class{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t;});}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r));};}};/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wr(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev");}catch(_unused2){return!1;}}async function mu(n){return(await fetch(n,{credentials:"include"})).ok;}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gu(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');let t={alg:"none",type:"JWT"},r=e||"demo-project",s=n.iat||0,o=n.sub||n.user_id;if(!o)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");let a={iss:"https://securetoken.google.com/".concat(r),aud:r,iat:s,exp:s+3600,auth_time:s,sub:o,user_id:o,firebase:{sign_in_provider:"custom",identities:{}},...n};return[Yn(JSON.stringify(t)),Yn(JSON.stringify(a)),""].join(".");}var Xn={};function Gd(){let n={prod:[],emulator:[]};for(let e of Object.keys(Xn))Xn[e]?n.emulator.push(e):n.prod.push(e);return n;}function zd(n){let e=document.getElementById(n),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",n),t=!0),{created:t,element:e};}var au=!1;function pu(n,e){if(typeof window>"u"||typeof document>"u"||!Wr(window.location.host)||Xn[n]===e||Xn[n]||au)return;Xn[n]=e;function t(g){return"__firebase__banner__".concat(g);}let r="__firebase__banner",o=Gd().prod.length>0;function a(){let g=document.getElementById(r);g&&g.remove();}function c(g){g.style.display="flex",g.style.background="#7faaf0",g.style.position="fixed",g.style.bottom="5px",g.style.left="5px",g.style.padding=".5em",g.style.borderRadius="5px",g.style.alignItems="center";}function l(g,T){g.setAttribute("width","24"),g.setAttribute("id",T),g.setAttribute("height","24"),g.setAttribute("viewBox","0 0 24 24"),g.setAttribute("fill","none"),g.style.marginLeft="-6px";}function h(){let g=document.createElement("span");return g.style.cursor="pointer",g.style.marginLeft="16px",g.style.fontSize="24px",g.innerHTML=" &times;",g.onclick=()=>{au=!0,a();},g;}function f(g,T){g.setAttribute("id",T),g.innerText="Learn more",g.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",g.setAttribute("target","__blank"),g.style.paddingLeft="5px",g.style.textDecoration="underline";}function p(){let g=zd(r),T=t("text"),C=document.getElementById(T)||document.createElement("span"),A=t("learnmore"),R=document.getElementById(A)||document.createElement("a"),V=t("preprendIcon"),k=document.getElementById(V)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(g.created){let F=g.element;c(F),f(R,A);let Y=h();l(k,V),F.append(k,C,R,Y),document.body.appendChild(F);}o?(C.innerText="Preview backend disconnected.",k.innerHTML="<g clip-path=\"url(#clip0_6013_33858)\">\n<path d=\"M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z\" fill=\"#212121\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_6013_33858\">\n<rect width=\"24\" height=\"24\" fill=\"white\"/>\n</clipPath>\n</defs>"):(k.innerHTML="<g clip-path=\"url(#clip0_6083_34804)\">\n<path d=\"M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z\" fill=\"#212121\"/>\n</g>\n<defs>\n<clipPath id=\"clip0_6083_34804\">\n<rect width=\"24\" height=\"24\" fill=\"white\"/>\n</clipPath>\n</defs>",C.innerText="Preview backend running in this workspace."),C.setAttribute("id",T);}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p();}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yu(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:"";}function jd(){var _vi3;let n=(_vi3=vi())===null||_vi3===void 0?void 0:_vi3.forceEnvironment;if(n==="node")return!0;if(n==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]";}catch(_unused3){return!1;}}function wu(){return!jd()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome");}function bi(){try{return typeof indexedDB=="object";}catch(_unused4){return!1;}}function _u(){return new Promise((n,e)=>{try{let t=!0,r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0);},s.onupgradeneeded=()=>{t=!1;},s.onerror=()=>{var _s$error;e(((_s$error=s.error)===null||_s$error===void 0?void 0:_s$error.message)||"");};}catch(t){e(t);}});}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var $d="FirebaseError",tt=class n extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=$d,Object.setPrototypeOf(this,n.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Zn.prototype.create);}},Zn=class{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r;}create(e,...t){let r=t[0]||{},s="".concat(this.service,"/").concat(e),o=this.errors[e],a=o?qd(o,r):"Error",c="".concat(this.serviceName,": ").concat(a," (").concat(s,").");return new tt(s,c,r);}};function qd(n,e){return n.replace(Hd,(t,r)=>{let s=e[r];return s!=null?String(s):"<".concat(r,"?>");});}var Hd=/\{\$([^}]+)}/g;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xt(n,e){if(n===e)return!0;let t=Object.keys(n),r=Object.keys(e);for(let s of t){if(!r.includes(s))return!1;let o=n[s],a=e[s];if(cu(o)&&cu(a)){if(!Xt(o,a))return!1;}else if(o!==a)return!1;}for(let s of r)if(!t.includes(s))return!1;return!0;}function cu(n){return n!==null&&typeof n=="object";}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ap=14400*1e3;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ge(n){return n&&n._delegate?n._delegate:n;}var nt=class{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null;}setInstantiationMode(e){return this.instantiationMode=e,this;}setMultipleInstances(e){return this.multipleInstances=e,this;}setServiceProps(e){return this.serviceProps=e,this;}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this;}};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var kt="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ti=class{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map(),this.instancesDeferred=new Map(),this.instancesOptions=new Map(),this.onInitCallbacks=new Map();}get(e){let t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){let r=new Qr();if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{let s=this.getOrInitializeService({instanceIdentifier:t});s&&r.resolve(s);}catch(_unused5){}}return this.instancesDeferred.get(t).promise;}getImmediate(e){var _e$optional;let t=this.normalizeInstanceIdentifier(e===null||e===void 0?void 0:e.identifier),r=(_e$optional=e===null||e===void 0?void 0:e.optional)!==null&&_e$optional!==void 0?_e$optional:!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t});}catch(s){if(r)return null;throw s;}else{if(r)return null;throw Error("Service ".concat(this.name," is not available"));}}getComponent(){return this.component;}setComponent(e){if(e.name!==this.name)throw Error("Mismatching Component ".concat(e.name," for Provider ").concat(this.name,"."));if(this.component)throw Error("Component for ".concat(this.name," has already been provided"));if(this.component=e,!!this.shouldAutoInitialize()){if(Wd(e))try{this.getOrInitializeService({instanceIdentifier:kt});}catch(_unused6){}for(let[t,r]of this.instancesDeferred.entries()){let s=this.normalizeInstanceIdentifier(t);try{let o=this.getOrInitializeService({instanceIdentifier:s});r.resolve(o);}catch(_unused7){}}}}clearInstance(e=kt){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e);}async delete(){let e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())]);}isComponentSet(){return this.component!=null;}isInitialized(e=kt){return this.instances.has(e);}getOptions(e=kt){return this.instancesOptions.get(e)||{};}initialize(e={}){let{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error("".concat(this.name,"(").concat(r,") has already been initialized"));if(!this.isComponentSet())throw Error("Component ".concat(this.name," has not been registered yet"));let s=this.getOrInitializeService({instanceIdentifier:r,options:t});for(let[o,a]of this.instancesDeferred.entries()){let c=this.normalizeInstanceIdentifier(o);r===c&&a.resolve(s);}return s;}onInit(e,t){var _this$onInitCallbacks;let r=this.normalizeInstanceIdentifier(t),s=(_this$onInitCallbacks=this.onInitCallbacks.get(r))!==null&&_this$onInitCallbacks!==void 0?_this$onInitCallbacks:new Set();s.add(e),this.onInitCallbacks.set(r,s);let o=this.instances.get(r);return o&&e(o,r),()=>{s.delete(e);};}invokeOnInitCallbacks(e,t){let r=this.onInitCallbacks.get(t);if(r)for(let s of r)try{s(e,t);}catch(_unused8){}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:Qd(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r);}catch(_unused9){}return r||null;}normalizeInstanceIdentifier(e=kt){return this.component?this.component.multipleInstances?e:kt:e;}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT";}};function Qd(n){return n===kt?void 0:n;}function Wd(n){return n.instantiationMode==="EAGER";}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Jr=class{constructor(e){this.name=e,this.providers=new Map();}addComponent(e){let t=this.getProvider(e.name);if(t.isComponentSet())throw new Error("Component ".concat(e.name," has already been registered with ").concat(this.name));t.setComponent(e);}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e);}getProvider(e){if(this.providers.has(e))return this.providers.get(e);let t=new Ti(e,this);return this.providers.set(e,t),t;}getProviders(){return Array.from(this.providers.values());}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Jd=[],X;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT";})(X||(X={}));var Xd={debug:X.DEBUG,verbose:X.VERBOSE,info:X.INFO,warn:X.WARN,error:X.ERROR,silent:X.SILENT},Yd=X.INFO,Zd={[X.DEBUG]:"log",[X.VERBOSE]:"log",[X.INFO]:"info",[X.WARN]:"warn",[X.ERROR]:"error"},ef=(n,e,...t)=>{if(e<n.logLevel)return;let r=new Date().toISOString(),s=Zd[e];if(s)console[s]("[".concat(r,"]  ").concat(n.name,":"),...t);else throw new Error("Attempted to log a message with an invalid logType (value: ".concat(e,")"));},Yt=class{constructor(e){this.name=e,this._logLevel=Yd,this._logHandler=ef,this._userLogHandler=null,Jd.push(this);}get logLevel(){return this._logLevel;}set logLevel(e){if(!(e in X))throw new TypeError("Invalid value \"".concat(e,"\" assigned to `logLevel`"));this._logLevel=e;}setLogLevel(e){this._logLevel=typeof e=="string"?Xd[e]:e;}get logHandler(){return this._logHandler;}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e;}get userLogHandler(){return this._userLogHandler;}set userLogHandler(e){this._userLogHandler=e;}debug(...e){this._userLogHandler&&this._userLogHandler(this,X.DEBUG,...e),this._logHandler(this,X.DEBUG,...e);}log(...e){this._userLogHandler&&this._userLogHandler(this,X.VERBOSE,...e),this._logHandler(this,X.VERBOSE,...e);}info(...e){this._userLogHandler&&this._userLogHandler(this,X.INFO,...e),this._logHandler(this,X.INFO,...e);}warn(...e){this._userLogHandler&&this._userLogHandler(this,X.WARN,...e),this._logHandler(this,X.WARN,...e);}error(...e){this._userLogHandler&&this._userLogHandler(this,X.ERROR,...e),this._logHandler(this,X.ERROR,...e);}};var tf=(n,e)=>e.some(t=>n instanceof t),vu,Eu;function nf(){return vu||(vu=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction]);}function rf(){return Eu||(Eu=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey]);}var bu=new WeakMap(),Si=new WeakMap(),Tu=new WeakMap(),Ii=new WeakMap(),Ci=new WeakMap();function sf(n){let e=new Promise((t,r)=>{let s=()=>{n.removeEventListener("success",o),n.removeEventListener("error",a);},o=()=>{t($e(n.result)),s();},a=()=>{r(n.error),s();};n.addEventListener("success",o),n.addEventListener("error",a);});return e.then(t=>{t instanceof IDBCursor&&bu.set(t,n);}).catch(()=>{}),Ci.set(e,n),e;}function of(n){if(Si.has(n))return;let e=new Promise((t,r)=>{let s=()=>{n.removeEventListener("complete",o),n.removeEventListener("error",a),n.removeEventListener("abort",a);},o=()=>{t(),s();},a=()=>{r(n.error||new DOMException("AbortError","AbortError")),s();};n.addEventListener("complete",o),n.addEventListener("error",a),n.addEventListener("abort",a);});Si.set(n,e);}var Ai={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return Si.get(n);if(e==="objectStoreNames")return n.objectStoreNames||Tu.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0]);}return $e(n[e]);},set(n,e,t){return n[e]=t,!0;},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n;}};function Iu(n){Ai=n(Ai);}function af(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){let r=n.call(Xr(this),e,...t);return Tu.set(r,e.sort?e.sort():[e]),$e(r);}:rf().includes(n)?function(...e){return n.apply(Xr(this),e),$e(bu.get(this));}:function(...e){return $e(n.apply(Xr(this),e));};}function cf(n){return typeof n=="function"?af(n):(n instanceof IDBTransaction&&of(n),tf(n,nf())?new Proxy(n,Ai):n);}function $e(n){if(n instanceof IDBRequest)return sf(n);if(Ii.has(n))return Ii.get(n);let e=cf(n);return e!==n&&(Ii.set(n,e),Ci.set(e,n)),e;}var Xr=n=>Ci.get(n);function Au(n,e,{blocked:t,upgrade:r,blocking:s,terminated:o}={}){let a=indexedDB.open(n,e),c=$e(a);return r&&a.addEventListener("upgradeneeded",l=>{r($e(a.result),l.oldVersion,l.newVersion,$e(a.transaction),l);}),t&&a.addEventListener("blocked",l=>t(l.oldVersion,l.newVersion,l)),c.then(l=>{o&&l.addEventListener("close",()=>o()),s&&l.addEventListener("versionchange",h=>s(h.oldVersion,h.newVersion,h));}).catch(()=>{}),c;}var uf=["get","getKey","getAll","getAllKeys","count"],lf=["put","add","delete","clear"],Ri=new Map();function Su(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(Ri.get(e))return Ri.get(e);let t=e.replace(/FromIndex$/,""),r=e!==t,s=lf.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(s||uf.includes(t)))return;let o=async function(a,...c){let l=this.transaction(a,s?"readwrite":"readonly"),h=l.store;return r&&(h=h.index(c.shift())),(await Promise.all([h[t](...c),s&&l.done]))[0];};return Ri.set(e,o),o;}Iu(n=>({...n,get:(e,t,r)=>Su(e,t)||n.get(e,t,r),has:(e,t)=>!!Su(e,t)||n.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Di=class{constructor(e){this.container=e;}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(hf(t)){let r=t.getImmediate();return"".concat(r.library,"/").concat(r.version);}else return null;}).filter(t=>t).join(" ");}};function hf(n){var _n$getComponent;return((_n$getComponent=n.getComponent())===null||_n$getComponent===void 0?void 0:_n$getComponent.type)==="VERSION";}var xi="@firebase/app",Cu="0.14.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var rt=new Yt("@firebase/app"),df="@firebase/app-compat",ff="@firebase/analytics-compat",mf="@firebase/analytics",gf="@firebase/app-check-compat",pf="@firebase/app-check",yf="@firebase/auth",wf="@firebase/auth-compat",_f="@firebase/database",vf="@firebase/data-connect",Ef="@firebase/database-compat",bf="@firebase/functions",Tf="@firebase/functions-compat",If="@firebase/installations",Sf="@firebase/installations-compat",Af="@firebase/messaging",Cf="@firebase/messaging-compat",Rf="@firebase/performance",Pf="@firebase/performance-compat",Df="@firebase/remote-config",xf="@firebase/remote-config-compat",Vf="@firebase/storage",Nf="@firebase/storage-compat",kf="@firebase/firestore",Of="@firebase/ai",Lf="@firebase/firestore-compat",Mf="firebase",Ff="12.0.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Vi="[DEFAULT]",Bf={[xi]:"fire-core",[df]:"fire-core-compat",[mf]:"fire-analytics",[ff]:"fire-analytics-compat",[pf]:"fire-app-check",[gf]:"fire-app-check-compat",[yf]:"fire-auth",[wf]:"fire-auth-compat",[_f]:"fire-rtdb",[vf]:"fire-data-connect",[Ef]:"fire-rtdb-compat",[bf]:"fire-fn",[Tf]:"fire-fn-compat",[If]:"fire-iid",[Sf]:"fire-iid-compat",[Af]:"fire-fcm",[Cf]:"fire-fcm-compat",[Rf]:"fire-perf",[Pf]:"fire-perf-compat",[Df]:"fire-rc",[xf]:"fire-rc-compat",[Vf]:"fire-gcs",[Nf]:"fire-gcs-compat",[kf]:"fire-fst",[Lf]:"fire-fst-compat",[Of]:"fire-vertex","fire-js":"fire-js",[Mf]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Yr=new Map(),Uf=new Map(),Ni=new Map();function Ru(n,e){try{n.container.addComponent(e);}catch(t){rt.debug("Component ".concat(e.name," failed to register with FirebaseApp ").concat(n.name),t);}}function er(n){let e=n.name;if(Ni.has(e))return rt.debug("There were multiple attempts to register component ".concat(e,".")),!1;Ni.set(e,n);for(let t of Yr.values())Ru(t,n);for(let t of Uf.values())Ru(t,n);return!0;}function Vu(n,e){let t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e);}function Nu(n){return n==null?!1:n.settings!==void 0;}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Kf={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},yt=new Zn("app","Firebase",Kf);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ki=class{constructor(e,t,r){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new nt("app",()=>this,"PUBLIC"));}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled;}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e;}get name(){return this.checkDestroyed(),this._name;}get options(){return this.checkDestroyed(),this._options;}get config(){return this.checkDestroyed(),this._config;}get container(){return this._container;}get isDeleted(){return this._isDeleted;}set isDeleted(e){this._isDeleted=e;}checkDestroyed(){if(this.isDeleted)throw yt.create("app-deleted",{appName:this._name});}};/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ku=Ff;function Mi(n,e={}){let t=n;typeof e!="object"&&(e={name:e});let r={name:Vi,automaticDataCollectionEnabled:!0,...e},s=r.name;if(typeof s!="string"||!s)throw yt.create("bad-app-name",{appName:String(s)});if(t||(t=Ei()),!t)throw yt.create("no-options");let o=Yr.get(s);if(o){if(Xt(t,o.options)&&Xt(r,o.config))return o;throw yt.create("duplicate-app",{appName:s});}let a=new Jr(s);for(let l of Ni.values())a.addComponent(l);let c=new ki(t,r,a);return Yr.set(s,c),c;}function Ou(n=Vi){let e=Yr.get(n);if(!e&&n===Vi&&Ei())return Mi();if(!e)throw yt.create("no-app",{appName:n});return e;}function wt(n,e,t){var _Bf$n;let r=(_Bf$n=Bf[n])!==null&&_Bf$n!==void 0?_Bf$n:n;t&&(r+="-".concat(t));let s=r.match(/\s|\//),o=e.match(/\s|\//);if(s||o){let a=["Unable to register library \"".concat(r,"\" with version \"").concat(e,"\":")];s&&a.push("library name \"".concat(r,"\" contains illegal characters (whitespace or \"/\")")),s&&o&&a.push("and"),o&&a.push("version name \"".concat(e,"\" contains illegal characters (whitespace or \"/\")")),rt.warn(a.join(" "));return;}er(new nt("".concat(r,"-version"),()=>({library:r,version:e}),"VERSION"));}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Gf="firebase-heartbeat-database",zf=1,tr="firebase-heartbeat-store",Pi=null;function Lu(){return Pi||(Pi=Au(Gf,zf,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(tr);}catch(t){console.warn(t);}}}}).catch(n=>{throw yt.create("idb-open",{originalErrorMessage:n.message});})),Pi;}async function jf(n){try{let t=(await Lu()).transaction(tr),r=await t.objectStore(tr).get(Mu(n));return await t.done,r;}catch(e){if(e instanceof tt)rt.warn(e.message);else{let t=yt.create("idb-get",{originalErrorMessage:e===null||e===void 0?void 0:e.message});rt.warn(t.message);}}}async function Pu(n,e){try{let r=(await Lu()).transaction(tr,"readwrite");await r.objectStore(tr).put(e,Mu(n)),await r.done;}catch(t){if(t instanceof tt)rt.warn(t.message);else{let r=yt.create("idb-set",{originalErrorMessage:t===null||t===void 0?void 0:t.message});rt.warn(r.message);}}}function Mu(n){return"".concat(n.name,"!").concat(n.options.appId);}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var $f=1024,qf=30,Oi=class{constructor(e){this.container=e,this._heartbeatsCache=null;let t=this.container.getProvider("app").getImmediate();this._storage=new Li(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r));}async triggerHeartbeat(){try{var _this$_heartbeatsCach,_this$_heartbeatsCach2;let t=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=Du();if(((_this$_heartbeatsCach=this._heartbeatsCache)===null||_this$_heartbeatsCach===void 0?void 0:_this$_heartbeatsCach.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((_this$_heartbeatsCach2=this._heartbeatsCache)===null||_this$_heartbeatsCach2===void 0?void 0:_this$_heartbeatsCach2.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(s=>s.date===r))return;if(this._heartbeatsCache.heartbeats.push({date:r,agent:t}),this._heartbeatsCache.heartbeats.length>qf){let s=Qf(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(s,1);}return this._storage.overwrite(this._heartbeatsCache);}catch(e){rt.warn(e);}}async getHeartbeatsHeader(){try{var _this$_heartbeatsCach3;if(this._heartbeatsCache===null&&(await this._heartbeatsCachePromise),((_this$_heartbeatsCach3=this._heartbeatsCache)===null||_this$_heartbeatsCach3===void 0?void 0:_this$_heartbeatsCach3.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";let e=Du(),{heartbeatsToSend:t,unsentEntries:r}=Hf(this._heartbeatsCache.heartbeats),s=Yn(JSON.stringify({version:2,heartbeats:t}));return this._heartbeatsCache.lastSentHeartbeatDate=e,r.length>0?(this._heartbeatsCache.heartbeats=r,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s;}catch(e){return rt.warn(e),"";}}};function Du(){return new Date().toISOString().substring(0,10);}function Hf(n,e=$f){let t=[],r=n.slice();for(let s of n){let o=t.find(a=>a.agent===s.agent);if(o){if(o.dates.push(s.date),xu(t)>e){o.dates.pop();break;}}else if(t.push({agent:s.agent,dates:[s.date]}),xu(t)>e){t.pop();break;}r=r.slice(1);}return{heartbeatsToSend:t,unsentEntries:r};}var Li=class{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck();}async runIndexedDBEnvironmentCheck(){return bi()?_u().then(()=>!0).catch(()=>!1):!1;}async read(){if(await this._canUseIndexedDBPromise){let t=await jf(this.app);return t!==null&&t!==void 0&&t.heartbeats?t:{heartbeats:[]};}else return{heartbeats:[]};}async overwrite(e){if(await this._canUseIndexedDBPromise){var _e$lastSentHeartbeatD;let r=await this.read();return Pu(this.app,{lastSentHeartbeatDate:(_e$lastSentHeartbeatD=e.lastSentHeartbeatDate)!==null&&_e$lastSentHeartbeatD!==void 0?_e$lastSentHeartbeatD:r.lastSentHeartbeatDate,heartbeats:e.heartbeats});}else return;}async add(e){if(await this._canUseIndexedDBPromise){var _e$lastSentHeartbeatD2;let r=await this.read();return Pu(this.app,{lastSentHeartbeatDate:(_e$lastSentHeartbeatD2=e.lastSentHeartbeatDate)!==null&&_e$lastSentHeartbeatD2!==void 0?_e$lastSentHeartbeatD2:r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]});}else return;}};function xu(n){return Yn(JSON.stringify({version:2,heartbeats:n})).length;}function Qf(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let r=1;r<n.length;r++)n[r].date<t&&(t=n[r].date,e=r);return e;}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wf(n){er(new nt("platform-logger",e=>new Di(e),"PRIVATE")),er(new nt("heartbeat",e=>new Oi(e),"PRIVATE")),wt(xi,Cu,n),wt(xi,Cu,"esm2020"),wt("fire-js","");}Wf("");var Jf="firebase",Xf="12.0.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */wt(Jf,Xf,"app");var Fu=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{},Bu={};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var st,Fi;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(I,_){function y(){}y.prototype=_.prototype,I.D=_.prototype,I.prototype=new y(),I.prototype.constructor=I,I.C=function(b,v,E){for(var w=Array(arguments.length-2),J=2;J<arguments.length;J++)w[J-2]=arguments[J];return _.prototype[v].apply(b,w);};}function t(){this.blockSize=-1;}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s();}e(r,t),r.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0;};function s(I,_,y){y||(y=0);var b=Array(16);if(typeof _=="string")for(var v=0;16>v;++v)b[v]=_.charCodeAt(y++)|_.charCodeAt(y++)<<8|_.charCodeAt(y++)<<16|_.charCodeAt(y++)<<24;else for(v=0;16>v;++v)b[v]=_[y++]|_[y++]<<8|_[y++]<<16|_[y++]<<24;_=I.g[0],y=I.g[1],v=I.g[2];var E=I.g[3],w=_+(E^y&(v^E))+b[0]+3614090360&4294967295;_=y+(w<<7&4294967295|w>>>25),w=E+(v^_&(y^v))+b[1]+3905402710&4294967295,E=_+(w<<12&4294967295|w>>>20),w=v+(y^E&(_^y))+b[2]+606105819&4294967295,v=E+(w<<17&4294967295|w>>>15),w=y+(_^v&(E^_))+b[3]+3250441966&4294967295,y=v+(w<<22&4294967295|w>>>10),w=_+(E^y&(v^E))+b[4]+4118548399&4294967295,_=y+(w<<7&4294967295|w>>>25),w=E+(v^_&(y^v))+b[5]+1200080426&4294967295,E=_+(w<<12&4294967295|w>>>20),w=v+(y^E&(_^y))+b[6]+2821735955&4294967295,v=E+(w<<17&4294967295|w>>>15),w=y+(_^v&(E^_))+b[7]+4249261313&4294967295,y=v+(w<<22&4294967295|w>>>10),w=_+(E^y&(v^E))+b[8]+1770035416&4294967295,_=y+(w<<7&4294967295|w>>>25),w=E+(v^_&(y^v))+b[9]+2336552879&4294967295,E=_+(w<<12&4294967295|w>>>20),w=v+(y^E&(_^y))+b[10]+4294925233&4294967295,v=E+(w<<17&4294967295|w>>>15),w=y+(_^v&(E^_))+b[11]+2304563134&4294967295,y=v+(w<<22&4294967295|w>>>10),w=_+(E^y&(v^E))+b[12]+1804603682&4294967295,_=y+(w<<7&4294967295|w>>>25),w=E+(v^_&(y^v))+b[13]+4254626195&4294967295,E=_+(w<<12&4294967295|w>>>20),w=v+(y^E&(_^y))+b[14]+2792965006&4294967295,v=E+(w<<17&4294967295|w>>>15),w=y+(_^v&(E^_))+b[15]+1236535329&4294967295,y=v+(w<<22&4294967295|w>>>10),w=_+(v^E&(y^v))+b[1]+4129170786&4294967295,_=y+(w<<5&4294967295|w>>>27),w=E+(y^v&(_^y))+b[6]+3225465664&4294967295,E=_+(w<<9&4294967295|w>>>23),w=v+(_^y&(E^_))+b[11]+643717713&4294967295,v=E+(w<<14&4294967295|w>>>18),w=y+(E^_&(v^E))+b[0]+3921069994&4294967295,y=v+(w<<20&4294967295|w>>>12),w=_+(v^E&(y^v))+b[5]+3593408605&4294967295,_=y+(w<<5&4294967295|w>>>27),w=E+(y^v&(_^y))+b[10]+38016083&4294967295,E=_+(w<<9&4294967295|w>>>23),w=v+(_^y&(E^_))+b[15]+3634488961&4294967295,v=E+(w<<14&4294967295|w>>>18),w=y+(E^_&(v^E))+b[4]+3889429448&4294967295,y=v+(w<<20&4294967295|w>>>12),w=_+(v^E&(y^v))+b[9]+568446438&4294967295,_=y+(w<<5&4294967295|w>>>27),w=E+(y^v&(_^y))+b[14]+3275163606&4294967295,E=_+(w<<9&4294967295|w>>>23),w=v+(_^y&(E^_))+b[3]+4107603335&4294967295,v=E+(w<<14&4294967295|w>>>18),w=y+(E^_&(v^E))+b[8]+1163531501&4294967295,y=v+(w<<20&4294967295|w>>>12),w=_+(v^E&(y^v))+b[13]+2850285829&4294967295,_=y+(w<<5&4294967295|w>>>27),w=E+(y^v&(_^y))+b[2]+4243563512&4294967295,E=_+(w<<9&4294967295|w>>>23),w=v+(_^y&(E^_))+b[7]+1735328473&4294967295,v=E+(w<<14&4294967295|w>>>18),w=y+(E^_&(v^E))+b[12]+2368359562&4294967295,y=v+(w<<20&4294967295|w>>>12),w=_+(y^v^E)+b[5]+4294588738&4294967295,_=y+(w<<4&4294967295|w>>>28),w=E+(_^y^v)+b[8]+2272392833&4294967295,E=_+(w<<11&4294967295|w>>>21),w=v+(E^_^y)+b[11]+1839030562&4294967295,v=E+(w<<16&4294967295|w>>>16),w=y+(v^E^_)+b[14]+4259657740&4294967295,y=v+(w<<23&4294967295|w>>>9),w=_+(y^v^E)+b[1]+2763975236&4294967295,_=y+(w<<4&4294967295|w>>>28),w=E+(_^y^v)+b[4]+1272893353&4294967295,E=_+(w<<11&4294967295|w>>>21),w=v+(E^_^y)+b[7]+4139469664&4294967295,v=E+(w<<16&4294967295|w>>>16),w=y+(v^E^_)+b[10]+3200236656&4294967295,y=v+(w<<23&4294967295|w>>>9),w=_+(y^v^E)+b[13]+681279174&4294967295,_=y+(w<<4&4294967295|w>>>28),w=E+(_^y^v)+b[0]+3936430074&4294967295,E=_+(w<<11&4294967295|w>>>21),w=v+(E^_^y)+b[3]+3572445317&4294967295,v=E+(w<<16&4294967295|w>>>16),w=y+(v^E^_)+b[6]+76029189&4294967295,y=v+(w<<23&4294967295|w>>>9),w=_+(y^v^E)+b[9]+3654602809&4294967295,_=y+(w<<4&4294967295|w>>>28),w=E+(_^y^v)+b[12]+3873151461&4294967295,E=_+(w<<11&4294967295|w>>>21),w=v+(E^_^y)+b[15]+530742520&4294967295,v=E+(w<<16&4294967295|w>>>16),w=y+(v^E^_)+b[2]+3299628645&4294967295,y=v+(w<<23&4294967295|w>>>9),w=_+(v^(y|~E))+b[0]+4096336452&4294967295,_=y+(w<<6&4294967295|w>>>26),w=E+(y^(_|~v))+b[7]+1126891415&4294967295,E=_+(w<<10&4294967295|w>>>22),w=v+(_^(E|~y))+b[14]+2878612391&4294967295,v=E+(w<<15&4294967295|w>>>17),w=y+(E^(v|~_))+b[5]+4237533241&4294967295,y=v+(w<<21&4294967295|w>>>11),w=_+(v^(y|~E))+b[12]+1700485571&4294967295,_=y+(w<<6&4294967295|w>>>26),w=E+(y^(_|~v))+b[3]+2399980690&4294967295,E=_+(w<<10&4294967295|w>>>22),w=v+(_^(E|~y))+b[10]+4293915773&4294967295,v=E+(w<<15&4294967295|w>>>17),w=y+(E^(v|~_))+b[1]+2240044497&4294967295,y=v+(w<<21&4294967295|w>>>11),w=_+(v^(y|~E))+b[8]+1873313359&4294967295,_=y+(w<<6&4294967295|w>>>26),w=E+(y^(_|~v))+b[15]+4264355552&4294967295,E=_+(w<<10&4294967295|w>>>22),w=v+(_^(E|~y))+b[6]+2734768916&4294967295,v=E+(w<<15&4294967295|w>>>17),w=y+(E^(v|~_))+b[13]+1309151649&4294967295,y=v+(w<<21&4294967295|w>>>11),w=_+(v^(y|~E))+b[4]+4149444226&4294967295,_=y+(w<<6&4294967295|w>>>26),w=E+(y^(_|~v))+b[11]+3174756917&4294967295,E=_+(w<<10&4294967295|w>>>22),w=v+(_^(E|~y))+b[2]+718787259&4294967295,v=E+(w<<15&4294967295|w>>>17),w=y+(E^(v|~_))+b[9]+3951481745&4294967295,I.g[0]=I.g[0]+_&4294967295,I.g[1]=I.g[1]+(v+(w<<21&4294967295|w>>>11))&4294967295,I.g[2]=I.g[2]+v&4294967295,I.g[3]=I.g[3]+E&4294967295;}r.prototype.u=function(I,_){_===void 0&&(_=I.length);for(var y=_-this.blockSize,b=this.B,v=this.h,E=0;E<_;){if(v==0)for(;E<=y;)s(this,I,E),E+=this.blockSize;if(typeof I=="string"){for(;E<_;)if(b[v++]=I.charCodeAt(E++),v==this.blockSize){s(this,b),v=0;break;}}else for(;E<_;)if(b[v++]=I[E++],v==this.blockSize){s(this,b),v=0;break;}}this.h=v,this.o+=_;},r.prototype.v=function(){var I=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);I[0]=128;for(var _=1;_<I.length-8;++_)I[_]=0;var y=8*this.o;for(_=I.length-8;_<I.length;++_)I[_]=y&255,y/=256;for(this.u(I),I=Array(16),_=y=0;4>_;++_)for(var b=0;32>b;b+=8)I[y++]=this.g[_]>>>b&255;return I;};function o(I,_){var y=c;return Object.prototype.hasOwnProperty.call(y,I)?y[I]:y[I]=_(I);}function a(I,_){this.h=_;for(var y=[],b=!0,v=I.length-1;0<=v;v--){var E=I[v]|0;b&&E==_||(y[v]=E,b=!1);}this.g=y;}var c={};function l(I){return-128<=I&&128>I?o(I,function(_){return new a([_|0],0>_?-1:0);}):new a([I|0],0>I?-1:0);}function h(I){if(isNaN(I)||!isFinite(I))return p;if(0>I)return R(h(-I));for(var _=[],y=1,b=0;I>=y;b++)_[b]=I/y|0,y*=4294967296;return new a(_,0);}function f(I,_){if(I.length==0)throw Error("number format error: empty string");if(_=_||10,2>_||36<_)throw Error("radix out of range: "+_);if(I.charAt(0)=="-")return R(f(I.substring(1),_));if(0<=I.indexOf("-"))throw Error('number format error: interior "-" character');for(var y=h(Math.pow(_,8)),b=p,v=0;v<I.length;v+=8){var E=Math.min(8,I.length-v),w=parseInt(I.substring(v,v+E),_);8>E?(E=h(Math.pow(_,E)),b=b.j(E).add(h(w))):(b=b.j(y),b=b.add(h(w)));}return b;}var p=l(0),g=l(1),T=l(16777216);n=a.prototype,n.m=function(){if(A(this))return-R(this).m();for(var I=0,_=1,y=0;y<this.g.length;y++){var b=this.i(y);I+=(0<=b?b:4294967296+b)*_,_*=4294967296;}return I;},n.toString=function(I){if(I=I||10,2>I||36<I)throw Error("radix out of range: "+I);if(C(this))return"0";if(A(this))return"-"+R(this).toString(I);for(var _=h(Math.pow(I,6)),y=this,b="";;){var v=Y(y,_).g;y=V(y,v.j(_));var E=((0<y.g.length?y.g[0]:y.h)>>>0).toString(I);if(y=v,C(y))return E+b;for(;6>E.length;)E="0"+E;b=E+b;}},n.i=function(I){return 0>I?0:I<this.g.length?this.g[I]:this.h;};function C(I){if(I.h!=0)return!1;for(var _=0;_<I.g.length;_++)if(I.g[_]!=0)return!1;return!0;}function A(I){return I.h==-1;}n.l=function(I){return I=V(this,I),A(I)?-1:C(I)?0:1;};function R(I){for(var _=I.g.length,y=[],b=0;b<_;b++)y[b]=~I.g[b];return new a(y,~I.h).add(g);}n.abs=function(){return A(this)?R(this):this;},n.add=function(I){for(var _=Math.max(this.g.length,I.g.length),y=[],b=0,v=0;v<=_;v++){var E=b+(this.i(v)&65535)+(I.i(v)&65535),w=(E>>>16)+(this.i(v)>>>16)+(I.i(v)>>>16);b=w>>>16,E&=65535,w&=65535,y[v]=w<<16|E;}return new a(y,y[y.length-1]&-2147483648?-1:0);};function V(I,_){return I.add(R(_));}n.j=function(I){if(C(this)||C(I))return p;if(A(this))return A(I)?R(this).j(R(I)):R(R(this).j(I));if(A(I))return R(this.j(R(I)));if(0>this.l(T)&&0>I.l(T))return h(this.m()*I.m());for(var _=this.g.length+I.g.length,y=[],b=0;b<2*_;b++)y[b]=0;for(b=0;b<this.g.length;b++)for(var v=0;v<I.g.length;v++){var E=this.i(b)>>>16,w=this.i(b)&65535,J=I.i(v)>>>16,ae=I.i(v)&65535;y[2*b+2*v]+=w*ae,k(y,2*b+2*v),y[2*b+2*v+1]+=E*ae,k(y,2*b+2*v+1),y[2*b+2*v+1]+=w*J,k(y,2*b+2*v+1),y[2*b+2*v+2]+=E*J,k(y,2*b+2*v+2);}for(b=0;b<_;b++)y[b]=y[2*b+1]<<16|y[2*b];for(b=_;b<2*_;b++)y[b]=0;return new a(y,0);};function k(I,_){for(;(I[_]&65535)!=I[_];)I[_+1]+=I[_]>>>16,I[_]&=65535,_++;}function F(I,_){this.g=I,this.h=_;}function Y(I,_){if(C(_))throw Error("division by zero");if(C(I))return new F(p,p);if(A(I))return _=Y(R(I),_),new F(R(_.g),R(_.h));if(A(_))return _=Y(I,R(_)),new F(R(_.g),_.h);if(30<I.g.length){if(A(I)||A(_))throw Error("slowDivide_ only works with positive integers.");for(var y=g,b=_;0>=b.l(I);)y=z(y),b=z(b);var v=ne(y,1),E=ne(b,1);for(b=ne(b,2),y=ne(y,2);!C(b);){var w=E.add(b);0>=w.l(I)&&(v=v.add(y),E=w),b=ne(b,1),y=ne(y,1);}return _=V(I,v.j(_)),new F(v,_);}for(v=p;0<=I.l(_);){for(y=Math.max(1,Math.floor(I.m()/_.m())),b=Math.ceil(Math.log(y)/Math.LN2),b=48>=b?1:Math.pow(2,b-48),E=h(y),w=E.j(_);A(w)||0<w.l(I);)y-=b,E=h(y),w=E.j(_);C(E)&&(E=g),v=v.add(E),I=V(I,w);}return new F(v,I);}n.A=function(I){return Y(this,I).h;},n.and=function(I){for(var _=Math.max(this.g.length,I.g.length),y=[],b=0;b<_;b++)y[b]=this.i(b)&I.i(b);return new a(y,this.h&I.h);},n.or=function(I){for(var _=Math.max(this.g.length,I.g.length),y=[],b=0;b<_;b++)y[b]=this.i(b)|I.i(b);return new a(y,this.h|I.h);},n.xor=function(I){for(var _=Math.max(this.g.length,I.g.length),y=[],b=0;b<_;b++)y[b]=this.i(b)^I.i(b);return new a(y,this.h^I.h);};function z(I){for(var _=I.g.length+1,y=[],b=0;b<_;b++)y[b]=I.i(b)<<1|I.i(b-1)>>>31;return new a(y,I.h);}function ne(I,_){var y=_>>5;_%=32;for(var b=I.g.length-y,v=[],E=0;E<b;E++)v[E]=0<_?I.i(E+y)>>>_|I.i(E+y+1)<<32-_:I.i(E+y);return new a(v,I.h);}r.prototype.digest=r.prototype.v,r.prototype.reset=r.prototype.s,r.prototype.update=r.prototype.u,Fi=Bu.Md5=r,a.prototype.add=a.prototype.add,a.prototype.multiply=a.prototype.j,a.prototype.modulo=a.prototype.A,a.prototype.compare=a.prototype.l,a.prototype.toNumber=a.prototype.m,a.prototype.toString=a.prototype.toString,a.prototype.getBits=a.prototype.i,a.fromNumber=h,a.fromString=f,st=Bu.Integer=a;}).apply(typeof Fu<"u"?Fu:typeof self<"u"?self:typeof window<"u"?window:{});var Zr=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{},it={};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Bi,Yf,Zt,Ui,nr,es,Ki,Gi,zi;(function(){var n,e=typeof Object.defineProperties=="function"?Object.defineProperty:function(i,u,d){return i==Array.prototype||i==Object.prototype||(i[u]=d.value),i;};function t(i){i=[typeof globalThis=="object"&&globalThis,i,typeof window=="object"&&window,typeof self=="object"&&self,typeof Zr=="object"&&Zr];for(var u=0;u<i.length;++u){var d=i[u];if(d&&d.Math==Math)return d;}throw Error("Cannot find global object");}var r=t(this);function s(i,u){if(u)e:{var d=r;i=i.split(".");for(var m=0;m<i.length-1;m++){var S=i[m];if(!(S in d))break e;d=d[S];}i=i[i.length-1],m=d[i],u=u(m),u!=m&&u!=null&&e(d,i,{configurable:!0,writable:!0,value:u});}}function o(i,u){i instanceof String&&(i+="");var d=0,m=!1,S={next:function(){if(!m&&d<i.length){var P=d++;return{value:u(P,i[P]),done:!1};}return m=!0,{done:!0,value:void 0};}};return S[Symbol.iterator]=function(){return S;},S;}s("Array.prototype.values",function(i){return i||function(){return o(this,function(u,d){return d;});};});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var a=a||{},c=this||self;function l(i){var u=typeof i;return u=u!="object"?u:i?Array.isArray(i)?"array":u:"null",u=="array"||u=="object"&&typeof i.length=="number";}function h(i){var u=typeof i;return u=="object"&&i!=null||u=="function";}function f(i,u,d){return i.call.apply(i.bind,arguments);}function p(i,u,d){if(!i)throw Error();if(2<arguments.length){var m=Array.prototype.slice.call(arguments,2);return function(){var S=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(S,m),i.apply(u,S);};}return function(){return i.apply(u,arguments);};}function g(i,u,d){return g=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?f:p,g.apply(null,arguments);}function T(i,u){var d=Array.prototype.slice.call(arguments,1);return function(){var m=d.slice();return m.push.apply(m,arguments),i.apply(this,m);};}function C(i,u){function d(){}d.prototype=u.prototype,i.aa=u.prototype,i.prototype=new d(),i.prototype.constructor=i,i.Qb=function(m,S,P){for(var L=Array(arguments.length-2),re=2;re<arguments.length;re++)L[re-2]=arguments[re];return u.prototype[S].apply(m,L);};}function A(i){let u=i.length;if(0<u){let d=Array(u);for(let m=0;m<u;m++)d[m]=i[m];return d;}return[];}function R(i,u){for(let d=1;d<arguments.length;d++){let m=arguments[d];if(l(m)){let S=i.length||0,P=m.length||0;i.length=S+P;for(let L=0;L<P;L++)i[S+L]=m[L];}else i.push(m);}}class V{constructor(u,d){this.i=u,this.j=d,this.h=0,this.g=null;}get(){let u;return 0<this.h?(this.h--,u=this.g,this.g=u.next,u.next=null):u=this.i(),u;}}function k(i){return /^[\s\xa0]*$/.test(i);}function F(){var i=c.navigator;return i&&(i=i.userAgent)?i:"";}function Y(i){return Y[" "](i),i;}Y[" "]=function(){};var z=F().indexOf("Gecko")!=-1&&!(F().toLowerCase().indexOf("webkit")!=-1&&F().indexOf("Edge")==-1)&&!(F().indexOf("Trident")!=-1||F().indexOf("MSIE")!=-1)&&F().indexOf("Edge")==-1;function ne(i,u,d){for(let m in i)u.call(d,i[m],m,i);}function I(i,u){for(let d in i)u.call(void 0,i[d],d,i);}function _(i){let u={};for(let d in i)u[d]=i[d];return u;}let y="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function b(i,u){let d,m;for(let S=1;S<arguments.length;S++){m=arguments[S];for(d in m)i[d]=m[d];for(let P=0;P<y.length;P++)d=y[P],Object.prototype.hasOwnProperty.call(m,d)&&(i[d]=m[d]);}}function v(i){var u=1;i=i.split(":");let d=[];for(;0<u&&i.length;)d.push(i.shift()),u--;return i.length&&d.push(i.join(":")),d;}function E(i){c.setTimeout(()=>{throw i;},0);}function w(){var i=je;let u=null;return i.g&&(u=i.g,i.g=i.g.next,i.g||(i.h=null),u.next=null),u;}class J{constructor(){this.h=this.g=null;}add(u,d){let m=ae.get();m.set(u,d),this.h?this.h.next=m:this.g=m,this.h=m;}}var ae=new V(()=>new _e(),i=>i.reset());class _e{constructor(){this.next=this.g=this.h=null;}set(u,d){this.h=u,this.g=d,this.next=null;}reset(){this.next=this.g=this.h=null;}}let Ue,dt=!1,je=new J(),Dr=()=>{let i=c.Promise.resolve(void 0);Ue=()=>{i.then(rd);};};var rd=()=>{for(var i;i=w();){try{i.h.call(i.g);}catch(d){E(d);}var u=ae;u.j(i),100>u.h&&(u.h++,i.next=u.g,u.g=i);}dt=!1;};function ft(){this.s=this.s,this.C=this.C;}ft.prototype.s=!1,ft.prototype.ma=function(){this.s||(this.s=!0,this.N());},ft.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()();};function ve(i,u){this.type=i,this.g=this.target=u,this.defaultPrevented=!1;}ve.prototype.h=function(){this.defaultPrevented=!0;};var sd=function(){if(!c.addEventListener||!Object.defineProperty)return!1;var i=!1,u=Object.defineProperty({},"passive",{get:function(){i=!0;}});try{let d=()=>{};c.addEventListener("test",d,u),c.removeEventListener("test",d,u);}catch(_unused0){}return i;}();function On(i,u){if(ve.call(this,i?i.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,i){var d=this.type=i.type,m=i.changedTouches&&i.changedTouches.length?i.changedTouches[0]:null;if(this.target=i.target||i.srcElement,this.g=u,u=i.relatedTarget){if(z){e:{try{Y(u.nodeName);var S=!0;break e;}catch(_unused1){}S=!1;}S||(u=null);}}else d=="mouseover"?u=i.fromElement:d=="mouseout"&&(u=i.toElement);this.relatedTarget=u,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=i.clientX!==void 0?i.clientX:i.pageX,this.clientY=i.clientY!==void 0?i.clientY:i.pageY,this.screenX=i.screenX||0,this.screenY=i.screenY||0),this.button=i.button,this.key=i.key||"",this.ctrlKey=i.ctrlKey,this.altKey=i.altKey,this.shiftKey=i.shiftKey,this.metaKey=i.metaKey,this.pointerId=i.pointerId||0,this.pointerType=typeof i.pointerType=="string"?i.pointerType:id[i.pointerType]||"",this.state=i.state,this.i=i,i.defaultPrevented&&On.aa.h.call(this);}}C(On,ve);var id={2:"touch",3:"pen",4:"mouse"};On.prototype.h=function(){On.aa.h.call(this);var i=this.i;i.preventDefault?i.preventDefault():i.returnValue=!1;};var Ln="closure_listenable_"+(1e6*Math.random()|0),od=0;function ad(i,u,d,m,S){this.listener=i,this.proxy=null,this.src=u,this.type=d,this.capture=!!m,this.ha=S,this.key=++od,this.da=this.fa=!1;}function xr(i){i.da=!0,i.listener=null,i.proxy=null,i.src=null,i.ha=null;}function Vr(i){this.src=i,this.g={},this.h=0;}Vr.prototype.add=function(i,u,d,m,S){var P=i.toString();i=this.g[P],i||(i=this.g[P]=[],this.h++);var L=Js(i,u,m,S);return-1<L?(u=i[L],d||(u.fa=!1)):(u=new ad(u,this.src,P,!!m,S),u.fa=d,i.push(u)),u;};function Ws(i,u){var d=u.type;if(d in i.g){var m=i.g[d],S=Array.prototype.indexOf.call(m,u,void 0),P;(P=0<=S)&&Array.prototype.splice.call(m,S,1),P&&(xr(u),i.g[d].length==0&&(delete i.g[d],i.h--));}}function Js(i,u,d,m){for(var S=0;S<i.length;++S){var P=i[S];if(!P.da&&P.listener==u&&P.capture==!!d&&P.ha==m)return S;}return-1;}var Xs="closure_lm_"+(1e6*Math.random()|0),Ys={};function oc(i,u,d,m,S){if(m&&m.once)return cc(i,u,d,m,S);if(Array.isArray(u)){for(var P=0;P<u.length;P++)oc(i,u[P],d,m,S);return null;}return d=ni(d),i&&i[Ln]?i.K(u,d,h(m)?!!m.capture:!!m,S):ac(i,u,d,!1,m,S);}function ac(i,u,d,m,S,P){if(!u)throw Error("Invalid event type");var L=h(S)?!!S.capture:!!S,re=ei(i);if(re||(i[Xs]=re=new Vr(i)),d=re.add(u,d,m,L,P),d.proxy)return d;if(m=cd(),d.proxy=m,m.src=i,m.listener=d,i.addEventListener)sd||(S=L),S===void 0&&(S=!1),i.addEventListener(u.toString(),m,S);else if(i.attachEvent)i.attachEvent(lc(u.toString()),m);else if(i.addListener&&i.removeListener)i.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return d;}function cd(){function i(d){return u.call(i.src,i.listener,d);}let u=ud;return i;}function cc(i,u,d,m,S){if(Array.isArray(u)){for(var P=0;P<u.length;P++)cc(i,u[P],d,m,S);return null;}return d=ni(d),i&&i[Ln]?i.L(u,d,h(m)?!!m.capture:!!m,S):ac(i,u,d,!0,m,S);}function uc(i,u,d,m,S){if(Array.isArray(u))for(var P=0;P<u.length;P++)uc(i,u[P],d,m,S);else m=h(m)?!!m.capture:!!m,d=ni(d),i&&i[Ln]?(i=i.i,u=String(u).toString(),u in i.g&&(P=i.g[u],d=Js(P,d,m,S),-1<d&&(xr(P[d]),Array.prototype.splice.call(P,d,1),P.length==0&&(delete i.g[u],i.h--)))):i&&(i=ei(i))&&(u=i.g[u.toString()],i=-1,u&&(i=Js(u,d,m,S)),(d=-1<i?u[i]:null)&&Zs(d));}function Zs(i){if(typeof i!="number"&&i&&!i.da){var u=i.src;if(u&&u[Ln])Ws(u.i,i);else{var d=i.type,m=i.proxy;u.removeEventListener?u.removeEventListener(d,m,i.capture):u.detachEvent?u.detachEvent(lc(d),m):u.addListener&&u.removeListener&&u.removeListener(m),(d=ei(u))?(Ws(d,i),d.h==0&&(d.src=null,u[Xs]=null)):xr(i);}}}function lc(i){return i in Ys?Ys[i]:Ys[i]="on"+i;}function ud(i,u){if(i.da)i=!0;else{u=new On(u,this);var d=i.listener,m=i.ha||i.src;i.fa&&Zs(i),i=d.call(m,u);}return i;}function ei(i){return i=i[Xs],i instanceof Vr?i:null;}var ti="__closure_events_fn_"+(1e9*Math.random()>>>0);function ni(i){return typeof i=="function"?i:(i[ti]||(i[ti]=function(u){return i.handleEvent(u);}),i[ti]);}function Ee(){ft.call(this),this.i=new Vr(this),this.M=this,this.F=null;}C(Ee,ft),Ee.prototype[Ln]=!0,Ee.prototype.removeEventListener=function(i,u,d,m){uc(this,i,u,d,m);};function Ae(i,u){var d,m=i.F;if(m)for(d=[];m;m=m.F)d.push(m);if(i=i.M,m=u.type||u,typeof u=="string")u=new ve(u,i);else if(u instanceof ve)u.target=u.target||i;else{var S=u;u=new ve(m,i),b(u,S);}if(S=!0,d)for(var P=d.length-1;0<=P;P--){var L=u.g=d[P];S=Nr(L,m,!0,u)&&S;}if(L=u.g=i,S=Nr(L,m,!0,u)&&S,S=Nr(L,m,!1,u)&&S,d)for(P=0;P<d.length;P++)L=u.g=d[P],S=Nr(L,m,!1,u)&&S;}Ee.prototype.N=function(){if(Ee.aa.N.call(this),this.i){var i=this.i,u;for(u in i.g){for(var d=i.g[u],m=0;m<d.length;m++)xr(d[m]);delete i.g[u],i.h--;}}this.F=null;},Ee.prototype.K=function(i,u,d,m){return this.i.add(String(i),u,!1,d,m);},Ee.prototype.L=function(i,u,d,m){return this.i.add(String(i),u,!0,d,m);};function Nr(i,u,d,m){if(u=i.i.g[String(u)],!u)return!0;u=u.concat();for(var S=!0,P=0;P<u.length;++P){var L=u[P];if(L&&!L.da&&L.capture==d){var re=L.listener,we=L.ha||L.src;L.fa&&Ws(i.i,L),S=re.call(we,m)!==!1&&S;}}return S&&!m.defaultPrevented;}function hc(i,u,d){if(typeof i=="function")d&&(i=g(i,d));else if(i&&typeof i.handleEvent=="function")i=g(i.handleEvent,i);else throw Error("Invalid listener argument");return 2147483647<Number(u)?-1:c.setTimeout(i,u||0);}function dc(i){i.g=hc(()=>{i.g=null,i.i&&(i.i=!1,dc(i));},i.l);let u=i.h;i.h=null,i.m.apply(null,u);}class ld extends ft{constructor(u,d){super(),this.m=u,this.l=d,this.h=null,this.i=!1,this.g=null;}j(u){this.h=arguments,this.g?this.i=!0:dc(this);}N(){super.N(),this.g&&(c.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null);}}function Mn(i){ft.call(this),this.h=i,this.g={};}C(Mn,ft);var fc=[];function mc(i){ne(i.g,function(u,d){this.g.hasOwnProperty(d)&&Zs(u);},i),i.g={};}Mn.prototype.N=function(){Mn.aa.N.call(this),mc(this);},Mn.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented");};var ri=c.JSON.stringify,hd=c.JSON.parse,dd=class{stringify(i){return c.JSON.stringify(i,void 0);}parse(i){return c.JSON.parse(i,void 0);}};function si(){}si.prototype.h=null;function gc(i){return i.h||(i.h=i.i());}function pc(){}var Fn={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function ii(){ve.call(this,"d");}C(ii,ve);function oi(){ve.call(this,"c");}C(oi,ve);var Dt={},yc=null;function kr(){return yc=yc||new Ee();}Dt.La="serverreachability";function wc(i){ve.call(this,Dt.La,i);}C(wc,ve);function Bn(i){let u=kr();Ae(u,new wc(u));}Dt.STAT_EVENT="statevent";function _c(i,u){ve.call(this,Dt.STAT_EVENT,i),this.stat=u;}C(_c,ve);function Ce(i){let u=kr();Ae(u,new _c(u,i));}Dt.Ma="timingevent";function vc(i,u){ve.call(this,Dt.Ma,i),this.size=u;}C(vc,ve);function Un(i,u){if(typeof i!="function")throw Error("Fn must not be null and must be a function");return c.setTimeout(function(){i();},u);}function Kn(){this.g=!0;}Kn.prototype.xa=function(){this.g=!1;};function fd(i,u,d,m,S,P){i.info(function(){if(i.g){if(P)for(var L="",re=P.split("&"),we=0;we<re.length;we++){var te=re[we].split("=");if(1<te.length){var be=te[0];te=te[1];var Te=be.split("_");L=2<=Te.length&&Te[1]=="type"?L+(be+"="+te+"&"):L+(be+"=redacted&");}}else L=null;}else L=P;return"XMLHTTP REQ ("+m+") [attempt "+S+"]: "+u+"\n"+d+"\n"+L;});}function md(i,u,d,m,S,P,L){i.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+S+"]: "+u+"\n"+d+"\n"+P+" "+L;});}function Ht(i,u,d,m){i.info(function(){return"XMLHTTP TEXT ("+u+"): "+pd(i,d)+(m?" "+m:"");});}function gd(i,u){i.info(function(){return"TIMEOUT: "+u;});}Kn.prototype.info=function(){};function pd(i,u){if(!i.g)return u;if(!u)return null;try{var d=JSON.parse(u);if(d){for(i=0;i<d.length;i++)if(Array.isArray(d[i])){var m=d[i];if(!(2>m.length)){var S=m[1];if(Array.isArray(S)&&!(1>S.length)){var P=S[0];if(P!="noop"&&P!="stop"&&P!="close")for(var L=1;L<S.length;L++)S[L]="";}}}}return ri(d);}catch(_unused10){return u;}}var Or={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},Ec={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},ai;function Lr(){}C(Lr,si),Lr.prototype.g=function(){return new XMLHttpRequest();},Lr.prototype.i=function(){return{};},ai=new Lr();function mt(i,u,d,m){this.j=i,this.i=u,this.l=d,this.R=m||1,this.U=new Mn(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new bc();}function bc(){this.i=null,this.g="",this.h=!1;}var Tc={},ci={};function ui(i,u,d){i.L=1,i.v=Ur(Ze(u)),i.m=d,i.P=!0,Ic(i,null);}function Ic(i,u){i.F=Date.now(),Mr(i),i.A=Ze(i.v);var d=i.A,m=i.R;Array.isArray(m)||(m=[String(m)]),Fc(d.i,"t",m),i.C=0,d=i.j.J,i.h=new bc(),i.g=nu(i.j,d?u:null,!i.m),0<i.O&&(i.M=new ld(g(i.Y,i,i.g),i.O)),u=i.U,d=i.g,m=i.ca;var S="readystatechange";Array.isArray(S)||(S&&(fc[0]=S.toString()),S=fc);for(var P=0;P<S.length;P++){var L=oc(d,S[P],m||u.handleEvent,!1,u.h||u);if(!L)break;u.g[L.key]=L;}u=i.H?_(i.H):{},i.m?(i.u||(i.u="POST"),u["Content-Type"]="application/x-www-form-urlencoded",i.g.ea(i.A,i.u,i.m,u)):(i.u="GET",i.g.ea(i.A,i.u,null,u)),Bn(),fd(i.i,i.u,i.A,i.l,i.R,i.m);}mt.prototype.ca=function(i){i=i.target;let u=this.M;u&&et(i)==3?u.j():this.Y(i);},mt.prototype.Y=function(i){try{if(i==this.g)e:{let Te=et(this.g);var u=this.g.Ba();let Jt=this.g.Z();if(!(3>Te)&&(Te!=3||this.g&&(this.h.h||this.g.oa()||$c(this.g)))){this.J||Te!=4||u==7||(u==8||0>=Jt?Bn(3):Bn(2)),li(this);var d=this.g.Z();this.X=d;t:if(Sc(this)){var m=$c(this.g);i="";var S=m.length,P=et(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){xt(this),Gn(this);var L="";break t;}this.h.i=new c.TextDecoder();}for(u=0;u<S;u++)this.h.h=!0,i+=this.h.i.decode(m[u],{stream:!(P&&u==S-1)});m.length=0,this.h.g+=i,this.C=0,L=this.h.g;}else L=this.g.oa();if(this.o=d==200,md(this.i,this.u,this.A,this.l,this.R,Te,d),this.o){if(this.T&&!this.K){t:{if(this.g){var re,we=this.g;if((re=we.g?we.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!k(re)){var te=re;break t;}}te=null;}if(d=te)Ht(this.i,this.l,d,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,hi(this,d);else{this.o=!1,this.s=3,Ce(12),xt(this),Gn(this);break e;}}if(this.P){d=!0;let Ke;for(;!this.J&&this.C<L.length;)if(Ke=yd(this,L),Ke==ci){Te==4&&(this.s=4,Ce(14),d=!1),Ht(this.i,this.l,null,"[Incomplete Response]");break;}else if(Ke==Tc){this.s=4,Ce(15),Ht(this.i,this.l,L,"[Invalid Chunk]"),d=!1;break;}else Ht(this.i,this.l,Ke,null),hi(this,Ke);if(Sc(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Te!=4||L.length!=0||this.h.h||(this.s=1,Ce(16),d=!1),this.o=this.o&&d,!d)Ht(this.i,this.l,L,"[Invalid Chunked Response]"),xt(this),Gn(this);else if(0<L.length&&!this.W){this.W=!0;var be=this.j;be.g==this&&be.ba&&!be.M&&(be.j.info("Great, no buffering proxy detected. Bytes received: "+L.length),yi(be),be.M=!0,Ce(11));}}else Ht(this.i,this.l,L,null),hi(this,L);Te==4&&xt(this),this.o&&!this.J&&(Te==4?Yc(this.j,this):(this.o=!1,Mr(this)));}else kd(this.g),d==400&&0<L.indexOf("Unknown SID")?(this.s=3,Ce(12)):(this.s=0,Ce(13)),xt(this),Gn(this);}}}catch(_unused11){}};function Sc(i){return i.g?i.u=="GET"&&i.L!=2&&i.j.Ca:!1;}function yd(i,u){var d=i.C,m=u.indexOf("\n",d);return m==-1?ci:(d=Number(u.substring(d,m)),isNaN(d)?Tc:(m+=1,m+d>u.length?ci:(u=u.slice(m,m+d),i.C=m+d,u)));}mt.prototype.cancel=function(){this.J=!0,xt(this);};function Mr(i){i.S=Date.now()+i.I,Ac(i,i.I);}function Ac(i,u){if(i.B!=null)throw Error("WatchDog timer not null");i.B=Un(g(i.ba,i),u);}function li(i){i.B&&(c.clearTimeout(i.B),i.B=null);}mt.prototype.ba=function(){this.B=null;let i=Date.now();0<=i-this.S?(gd(this.i,this.A),this.L!=2&&(Bn(),Ce(17)),xt(this),this.s=2,Gn(this)):Ac(this,this.S-i);};function Gn(i){i.j.G==0||i.J||Yc(i.j,i);}function xt(i){li(i);var u=i.M;u&&typeof u.ma=="function"&&u.ma(),i.M=null,mc(i.U),i.g&&(u=i.g,i.g=null,u.abort(),u.ma());}function hi(i,u){try{var d=i.j;if(d.G!=0&&(d.g==i||di(d.h,i))){if(!i.K&&di(d.h,i)&&d.G==3){try{var m=d.Da.g.parse(u);}catch(_unused12){m=null;}if(Array.isArray(m)&&m.length==3){var S=m;if(S[0]==0){e:if(!d.u){if(d.g)if(d.g.F+3e3<i.F)$r(d),zr(d);else break e;pi(d),Ce(18);}}else d.za=S[1],0<d.za-d.T&&37500>S[2]&&d.F&&d.v==0&&!d.C&&(d.C=Un(g(d.Za,d),6e3));if(1>=Pc(d.h)&&d.ca){try{d.ca();}catch(_unused13){}d.ca=void 0;}}else Nt(d,11);}else if((i.K||d.g==i)&&$r(d),!k(u))for(S=d.Da.g.parse(u),u=0;u<S.length;u++){let te=S[u];if(d.T=te[0],te=te[1],d.G==2){if(te[0]=="c"){d.K=te[1],d.ia=te[2];let be=te[3];be!=null&&(d.la=be,d.j.info("VER="+d.la));let Te=te[4];Te!=null&&(d.Aa=Te,d.j.info("SVER="+d.Aa));let Jt=te[5];Jt!=null&&typeof Jt=="number"&&0<Jt&&(m=1.5*Jt,d.L=m,d.j.info("backChannelRequestTimeoutMs_="+m)),m=d;let Ke=i.g;if(Ke){let Hr=Ke.g?Ke.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Hr){var P=m.h;P.g||Hr.indexOf("spdy")==-1&&Hr.indexOf("quic")==-1&&Hr.indexOf("h2")==-1||(P.j=P.l,P.g=new Set(),P.h&&(fi(P,P.h),P.h=null));}if(m.D){let wi=Ke.g?Ke.g.getResponseHeader("X-HTTP-Session-Id"):null;wi&&(m.ya=wi,se(m.I,m.D,wi));}}d.G=3,d.l&&d.l.ua(),d.ba&&(d.R=Date.now()-i.F,d.j.info("Handshake RTT: "+d.R+"ms")),m=d;var L=i;if(m.qa=tu(m,m.J?m.ia:null,m.W),L.K){Dc(m.h,L);var re=L,we=m.L;we&&(re.I=we),re.B&&(li(re),Mr(re)),m.g=L;}else Jc(m);0<d.i.length&&jr(d);}else te[0]!="stop"&&te[0]!="close"||Nt(d,7);}else d.G==3&&(te[0]=="stop"||te[0]=="close"?te[0]=="stop"?Nt(d,7):gi(d):te[0]!="noop"&&d.l&&d.l.ta(te),d.v=0);}}Bn(4);}catch(_unused14){}}var wd=class{constructor(i,u){this.g=i,this.map=u;}};function Cc(i){this.l=i||10,c.PerformanceNavigationTiming?(i=c.performance.getEntriesByType("navigation"),i=0<i.length&&(i[0].nextHopProtocol=="hq"||i[0].nextHopProtocol=="h2")):i=!!(c.chrome&&c.chrome.loadTimes&&c.chrome.loadTimes()&&c.chrome.loadTimes().wasFetchedViaSpdy),this.j=i?this.l:1,this.g=null,1<this.j&&(this.g=new Set()),this.h=null,this.i=[];}function Rc(i){return i.h?!0:i.g?i.g.size>=i.j:!1;}function Pc(i){return i.h?1:i.g?i.g.size:0;}function di(i,u){return i.h?i.h==u:i.g?i.g.has(u):!1;}function fi(i,u){i.g?i.g.add(u):i.h=u;}function Dc(i,u){i.h&&i.h==u?i.h=null:i.g&&i.g.has(u)&&i.g.delete(u);}Cc.prototype.cancel=function(){if(this.i=xc(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(let i of this.g.values())i.cancel();this.g.clear();}};function xc(i){if(i.h!=null)return i.i.concat(i.h.D);if(i.g!=null&&i.g.size!==0){let u=i.i;for(let d of i.g.values())u=u.concat(d.D);return u;}return A(i.i);}function _d(i){if(i.V&&typeof i.V=="function")return i.V();if(typeof Map<"u"&&i instanceof Map||typeof Set<"u"&&i instanceof Set)return Array.from(i.values());if(typeof i=="string")return i.split("");if(l(i)){for(var u=[],d=i.length,m=0;m<d;m++)u.push(i[m]);return u;}u=[],d=0;for(m in i)u[d++]=i[m];return u;}function vd(i){if(i.na&&typeof i.na=="function")return i.na();if(!i.V||typeof i.V!="function"){if(typeof Map<"u"&&i instanceof Map)return Array.from(i.keys());if(!(typeof Set<"u"&&i instanceof Set)){if(l(i)||typeof i=="string"){var u=[];i=i.length;for(var d=0;d<i;d++)u.push(d);return u;}u=[],d=0;for(let m in i)u[d++]=m;return u;}}}function Vc(i,u){if(i.forEach&&typeof i.forEach=="function")i.forEach(u,void 0);else if(l(i)||typeof i=="string")Array.prototype.forEach.call(i,u,void 0);else for(var d=vd(i),m=_d(i),S=m.length,P=0;P<S;P++)u.call(void 0,m[P],d&&d[P],i);}var Nc=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Ed(i,u){if(i){i=i.split("&");for(var d=0;d<i.length;d++){var m=i[d].indexOf("="),S=null;if(0<=m){var P=i[d].substring(0,m);S=i[d].substring(m+1);}else P=i[d];u(P,S?decodeURIComponent(S.replace(/\+/g," ")):"");}}}function Vt(i){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,i instanceof Vt){this.h=i.h,Fr(this,i.j),this.o=i.o,this.g=i.g,Br(this,i.s),this.l=i.l;var u=i.i,d=new $n();d.i=u.i,u.g&&(d.g=new Map(u.g),d.h=u.h),kc(this,d),this.m=i.m;}else i&&(u=String(i).match(Nc))?(this.h=!1,Fr(this,u[1]||"",!0),this.o=zn(u[2]||""),this.g=zn(u[3]||"",!0),Br(this,u[4]),this.l=zn(u[5]||"",!0),kc(this,u[6]||"",!0),this.m=zn(u[7]||"")):(this.h=!1,this.i=new $n(null,this.h));}Vt.prototype.toString=function(){var i=[],u=this.j;u&&i.push(jn(u,Oc,!0),":");var d=this.g;return(d||u=="file")&&(i.push("//"),(u=this.o)&&i.push(jn(u,Oc,!0),"@"),i.push(encodeURIComponent(String(d)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),d=this.s,d!=null&&i.push(":",String(d))),(d=this.l)&&(this.g&&d.charAt(0)!="/"&&i.push("/"),i.push(jn(d,d.charAt(0)=="/"?Id:Td,!0))),(d=this.i.toString())&&i.push("?",d),(d=this.m)&&i.push("#",jn(d,Ad)),i.join("");};function Ze(i){return new Vt(i);}function Fr(i,u,d){i.j=d?zn(u,!0):u,i.j&&(i.j=i.j.replace(/:$/,""));}function Br(i,u){if(u){if(u=Number(u),isNaN(u)||0>u)throw Error("Bad port number "+u);i.s=u;}else i.s=null;}function kc(i,u,d){u instanceof $n?(i.i=u,Cd(i.i,i.h)):(d||(u=jn(u,Sd)),i.i=new $n(u,i.h));}function se(i,u,d){i.i.set(u,d);}function Ur(i){return se(i,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),i;}function zn(i,u){return i?u?decodeURI(i.replace(/%25/g,"%2525")):decodeURIComponent(i):"";}function jn(i,u,d){return typeof i=="string"?(i=encodeURI(i).replace(u,bd),d&&(i=i.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),i):null;}function bd(i){return i=i.charCodeAt(0),"%"+(i>>4&15).toString(16)+(i&15).toString(16);}var Oc=/[#\/\?@]/g,Td=/[#\?:]/g,Id=/[#\?]/g,Sd=/[#\?@]/g,Ad=/#/g;function $n(i,u){this.h=this.g=null,this.i=i||null,this.j=!!u;}function gt(i){i.g||(i.g=new Map(),i.h=0,i.i&&Ed(i.i,function(u,d){i.add(decodeURIComponent(u.replace(/\+/g," ")),d);}));}n=$n.prototype,n.add=function(i,u){gt(this),this.i=null,i=Qt(this,i);var d=this.g.get(i);return d||this.g.set(i,d=[]),d.push(u),this.h+=1,this;};function Lc(i,u){gt(i),u=Qt(i,u),i.g.has(u)&&(i.i=null,i.h-=i.g.get(u).length,i.g.delete(u));}function Mc(i,u){return gt(i),u=Qt(i,u),i.g.has(u);}n.forEach=function(i,u){gt(this),this.g.forEach(function(d,m){d.forEach(function(S){i.call(u,S,m,this);},this);},this);},n.na=function(){gt(this);let i=Array.from(this.g.values()),u=Array.from(this.g.keys()),d=[];for(let m=0;m<u.length;m++){let S=i[m];for(let P=0;P<S.length;P++)d.push(u[m]);}return d;},n.V=function(i){gt(this);let u=[];if(typeof i=="string")Mc(this,i)&&(u=u.concat(this.g.get(Qt(this,i))));else{i=Array.from(this.g.values());for(let d=0;d<i.length;d++)u=u.concat(i[d]);}return u;},n.set=function(i,u){return gt(this),this.i=null,i=Qt(this,i),Mc(this,i)&&(this.h-=this.g.get(i).length),this.g.set(i,[u]),this.h+=1,this;},n.get=function(i,u){return i?(i=this.V(i),0<i.length?String(i[0]):u):u;};function Fc(i,u,d){Lc(i,u),0<d.length&&(i.i=null,i.g.set(Qt(i,u),A(d)),i.h+=d.length);}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";let i=[],u=Array.from(this.g.keys());for(var d=0;d<u.length;d++){var m=u[d];let P=encodeURIComponent(String(m)),L=this.V(m);for(m=0;m<L.length;m++){var S=P;L[m]!==""&&(S+="="+encodeURIComponent(String(L[m]))),i.push(S);}}return this.i=i.join("&");};function Qt(i,u){return u=String(u),i.j&&(u=u.toLowerCase()),u;}function Cd(i,u){u&&!i.j&&(gt(i),i.i=null,i.g.forEach(function(d,m){var S=m.toLowerCase();m!=S&&(Lc(this,m),Fc(this,S,d));},i)),i.j=u;}function Rd(i,u){let d=new Kn();if(c.Image){let m=new Image();m.onload=T(pt,d,"TestLoadImage: loaded",!0,u,m),m.onerror=T(pt,d,"TestLoadImage: error",!1,u,m),m.onabort=T(pt,d,"TestLoadImage: abort",!1,u,m),m.ontimeout=T(pt,d,"TestLoadImage: timeout",!1,u,m),c.setTimeout(function(){m.ontimeout&&m.ontimeout();},1e4),m.src=i;}else u(!1);}function Pd(i,u){let d=new Kn(),m=new AbortController(),S=setTimeout(()=>{m.abort(),pt(d,"TestPingServer: timeout",!1,u);},1e4);fetch(i,{signal:m.signal}).then(P=>{clearTimeout(S),P.ok?pt(d,"TestPingServer: ok",!0,u):pt(d,"TestPingServer: server error",!1,u);}).catch(()=>{clearTimeout(S),pt(d,"TestPingServer: error",!1,u);});}function pt(i,u,d,m,S){try{S&&(S.onload=null,S.onerror=null,S.onabort=null,S.ontimeout=null),m(d);}catch(_unused15){}}function Dd(){this.g=new dd();}function xd(i,u,d){let m=d||"";try{Vc(i,function(S,P){let L=S;h(S)&&(L=ri(S)),u.push(m+P+"="+encodeURIComponent(L));});}catch(S){throw u.push(m+"type="+encodeURIComponent("_badmap")),S;}}function qn(i){this.l=i.Ub||null,this.j=i.eb||!1;}C(qn,si),qn.prototype.g=function(){return new Kr(this.l,this.j);},qn.prototype.i=function(i){return function(){return i;};}({});function Kr(i,u){Ee.call(this),this.D=i,this.o=u,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers(),this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null;}C(Kr,Ee),n=Kr.prototype,n.open=function(i,u){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=i,this.A=u,this.readyState=1,Qn(this);},n.send=function(i){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;let u={headers:this.u,method:this.B,credentials:this.m,cache:void 0};i&&(u.body=i),(this.D||c).fetch(new Request(this.A,u)).then(this.Sa.bind(this),this.ga.bind(this));},n.abort=function(){this.response=this.responseText="",this.u=new Headers(),this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,Hn(this)),this.readyState=0;},n.Sa=function(i){if(this.g&&(this.l=i,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=i.headers,this.readyState=2,Qn(this)),this.g&&(this.readyState=3,Qn(this),this.g)))if(this.responseType==="arraybuffer")i.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof c.ReadableStream<"u"&&"body"in i){if(this.j=i.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[];}else this.response=this.responseText="",this.v=new TextDecoder();Bc(this);}else i.text().then(this.Ra.bind(this),this.ga.bind(this));};function Bc(i){i.j.read().then(i.Pa.bind(i)).catch(i.ga.bind(i));}n.Pa=function(i){if(this.g){if(this.o&&i.value)this.response.push(i.value);else if(!this.o){var u=i.value?i.value:new Uint8Array(0);(u=this.v.decode(u,{stream:!i.done}))&&(this.response=this.responseText+=u);}i.done?Hn(this):Qn(this),this.readyState==3&&Bc(this);}},n.Ra=function(i){this.g&&(this.response=this.responseText=i,Hn(this));},n.Qa=function(i){this.g&&(this.response=i,Hn(this));},n.ga=function(){this.g&&Hn(this);};function Hn(i){i.readyState=4,i.l=null,i.j=null,i.v=null,Qn(i);}n.setRequestHeader=function(i,u){this.u.append(i,u);},n.getResponseHeader=function(i){return this.h&&this.h.get(i.toLowerCase())||"";},n.getAllResponseHeaders=function(){if(!this.h)return"";let i=[],u=this.h.entries();for(var d=u.next();!d.done;)d=d.value,i.push(d[0]+": "+d[1]),d=u.next();return i.join("\r\n");};function Qn(i){i.onreadystatechange&&i.onreadystatechange.call(i);}Object.defineProperty(Kr.prototype,"withCredentials",{get:function(){return this.m==="include";},set:function(i){this.m=i?"include":"same-origin";}});function Uc(i){let u="";return ne(i,function(d,m){u+=m,u+=":",u+=d,u+="\r\n";}),u;}function mi(i,u,d){e:{for(m in d){var m=!1;break e;}m=!0;}m||(d=Uc(d),typeof i=="string"?d!=null&&encodeURIComponent(String(d)):se(i,u,d));}function ce(i){Ee.call(this),this.headers=new Map(),this.o=i||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1;}C(ce,Ee);var Vd=/^https?$/i,Nd=["POST","PUT"];n=ce.prototype,n.Ha=function(i){this.J=i;},n.ea=function(i,u,d,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+i);u=u?u.toUpperCase():"GET",this.D=i,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():ai.g(),this.v=this.o?gc(this.o):gc(ai),this.g.onreadystatechange=g(this.Ea,this);try{this.B=!0,this.g.open(u,String(i),!0),this.B=!1;}catch(P){Kc(this,P);return;}if(i=d||"",d=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var S in m)d.set(S,m[S]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(let P of m.keys())d.set(P,m.get(P));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(d.keys()).find(P=>P.toLowerCase()=="content-type"),S=c.FormData&&i instanceof c.FormData,!(0<=Array.prototype.indexOf.call(Nd,u,void 0))||m||S||d.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(let[P,L]of d)this.g.setRequestHeader(P,L);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{jc(this),this.u=!0,this.g.send(i),this.u=!1;}catch(P){Kc(this,P);}};function Kc(i,u){i.h=!1,i.g&&(i.j=!0,i.g.abort(),i.j=!1),i.l=u,i.m=5,Gc(i),Gr(i);}function Gc(i){i.A||(i.A=!0,Ae(i,"complete"),Ae(i,"error"));}n.abort=function(i){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=i||7,Ae(this,"complete"),Ae(this,"abort"),Gr(this));},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Gr(this,!0)),ce.aa.N.call(this);},n.Ea=function(){this.s||(this.B||this.u||this.j?zc(this):this.bb());},n.bb=function(){zc(this);};function zc(i){if(i.h&&typeof a<"u"&&(!i.v[1]||et(i)!=4||i.Z()!=2)){if(i.u&&et(i)==4)hc(i.Ea,0,i);else if(Ae(i,"readystatechange"),et(i)==4){i.h=!1;try{let L=i.Z();e:switch(L){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var u=!0;break e;default:u=!1;}var d;if(!(d=u)){var m;if(m=L===0){var S=String(i.D).match(Nc)[1]||null;!S&&c.self&&c.self.location&&(S=c.self.location.protocol.slice(0,-1)),m=!Vd.test(S?S.toLowerCase():"");}d=m;}if(d)Ae(i,"complete"),Ae(i,"success");else{i.m=6;try{var P=2<et(i)?i.g.statusText:"";}catch(_unused16){P="";}i.l=P+" ["+i.Z()+"]",Gc(i);}}finally{Gr(i);}}}}function Gr(i,u){if(i.g){jc(i);let d=i.g,m=i.v[0]?()=>{}:null;i.g=null,i.v=null,u||Ae(i,"ready");try{d.onreadystatechange=m;}catch(_unused17){}}}function jc(i){i.I&&(c.clearTimeout(i.I),i.I=null);}n.isActive=function(){return!!this.g;};function et(i){return i.g?i.g.readyState:0;}n.Z=function(){try{return 2<et(this)?this.g.status:-1;}catch(_unused18){return-1;}},n.oa=function(){try{return this.g?this.g.responseText:"";}catch(_unused19){return"";}},n.Oa=function(i){if(this.g){var u=this.g.responseText;return i&&u.indexOf(i)==0&&(u=u.substring(i.length)),hd(u);}};function $c(i){try{if(!i.g)return null;if("response"in i.g)return i.g.response;switch(i.H){case"":case"text":return i.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in i.g)return i.g.mozResponseArrayBuffer;}return null;}catch(_unused20){return null;}}function kd(i){let u={};i=(i.g&&2<=et(i)&&i.g.getAllResponseHeaders()||"").split("\r\n");for(let m=0;m<i.length;m++){if(k(i[m]))continue;var d=v(i[m]);let S=d[0];if(d=d[1],typeof d!="string")continue;d=d.trim();let P=u[S]||[];u[S]=P,P.push(d);}I(u,function(m){return m.join(", ");});}n.Ba=function(){return this.m;},n.Ka=function(){return typeof this.l=="string"?this.l:String(this.l);};function Wn(i,u,d){return d&&d.internalChannelParams&&d.internalChannelParams[i]||u;}function qc(i){this.Aa=0,this.i=[],this.j=new Kn(),this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=Wn("failFast",!1,i),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=Wn("baseRetryDelayMs",5e3,i),this.cb=Wn("retryDelaySeedMs",1e4,i),this.Wa=Wn("forwardChannelMaxRetries",2,i),this.wa=Wn("forwardChannelRequestTimeoutMs",2e4,i),this.pa=i&&i.xmlHttpFactory||void 0,this.Xa=i&&i.Tb||void 0,this.Ca=i&&i.useFetchStreams||!1,this.L=void 0,this.J=i&&i.supportsCrossDomainXhr||!1,this.K="",this.h=new Cc(i&&i.concurrentRequestLimit),this.Da=new Dd(),this.P=i&&i.fastHandshake||!1,this.O=i&&i.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=i&&i.Rb||!1,i&&i.xa&&this.j.xa(),i&&i.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&i&&i.detectBufferingProxy||!1,this.ja=void 0,i&&i.longPollingTimeout&&0<i.longPollingTimeout&&(this.ja=i.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null;}n=qc.prototype,n.la=8,n.G=1,n.connect=function(i,u,d,m){Ce(0),this.W=i,this.H=u||{},d&&m!==void 0&&(this.H.OSID=d,this.H.OAID=m),this.F=this.X,this.I=tu(this,null,this.W),jr(this);};function gi(i){if(Hc(i),i.G==3){var u=i.U++,d=Ze(i.I);if(se(d,"SID",i.K),se(d,"RID",u),se(d,"TYPE","terminate"),Jn(i,d),u=new mt(i,i.j,u),u.L=2,u.v=Ur(Ze(d)),d=!1,c.navigator&&c.navigator.sendBeacon)try{d=c.navigator.sendBeacon(u.v.toString(),"");}catch(_unused21){}!d&&c.Image&&(new Image().src=u.v,d=!0),d||(u.g=nu(u.j,null),u.g.ea(u.v)),u.F=Date.now(),Mr(u);}eu(i);}function zr(i){i.g&&(yi(i),i.g.cancel(),i.g=null);}function Hc(i){zr(i),i.u&&(c.clearTimeout(i.u),i.u=null),$r(i),i.h.cancel(),i.s&&(typeof i.s=="number"&&c.clearTimeout(i.s),i.s=null);}function jr(i){if(!Rc(i.h)&&!i.s){i.s=!0;var u=i.Ga;Ue||Dr(),dt||(Ue(),dt=!0),je.add(u,i),i.B=0;}}function Od(i,u){return Pc(i.h)>=i.h.j-(i.s?1:0)?!1:i.s?(i.i=u.D.concat(i.i),!0):i.G==1||i.G==2||i.B>=(i.Va?0:i.Wa)?!1:(i.s=Un(g(i.Ga,i,u),Zc(i,i.B)),i.B++,!0);}n.Ga=function(i){if(this.s)if(this.s=null,this.G==1){if(!i){this.U=Math.floor(1e5*Math.random()),i=this.U++;let S=new mt(this,this.j,i),P=this.o;if(this.S&&(P?(P=_(P),b(P,this.S)):P=this.S),this.m!==null||this.O||(S.H=P,P=null),this.P)e:{for(var u=0,d=0;d<this.i.length;d++){t:{var m=this.i[d];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break t;}m=void 0;}if(m===void 0)break;if(u+=m,4096<u){u=d;break e;}if(u===4096||d===this.i.length-1){u=d+1;break e;}}u=1e3;}else u=1e3;u=Wc(this,S,u),d=Ze(this.I),se(d,"RID",i),se(d,"CVER",22),this.D&&se(d,"X-HTTP-Session-Id",this.D),Jn(this,d),P&&(this.O?u="headers="+encodeURIComponent(String(Uc(P)))+"&"+u:this.m&&mi(d,this.m,P)),fi(this.h,S),this.Ua&&se(d,"TYPE","init"),this.P?(se(d,"$req",u),se(d,"SID","null"),S.T=!0,ui(S,d,null)):ui(S,d,u),this.G=2;}}else this.G==3&&(i?Qc(this,i):this.i.length==0||Rc(this.h)||Qc(this));};function Qc(i,u){var d;u?d=u.l:d=i.U++;let m=Ze(i.I);se(m,"SID",i.K),se(m,"RID",d),se(m,"AID",i.T),Jn(i,m),i.m&&i.o&&mi(m,i.m,i.o),d=new mt(i,i.j,d,i.B+1),i.m===null&&(d.H=i.o),u&&(i.i=u.D.concat(i.i)),u=Wc(i,d,1e3),d.I=Math.round(.5*i.wa)+Math.round(.5*i.wa*Math.random()),fi(i.h,d),ui(d,m,u);}function Jn(i,u){i.H&&ne(i.H,function(d,m){se(u,m,d);}),i.l&&Vc({},function(d,m){se(u,m,d);});}function Wc(i,u,d){d=Math.min(i.i.length,d);var m=i.l?g(i.l.Na,i.l,i):null;e:{var S=i.i;let P=-1;for(;;){let L=["count="+d];P==-1?0<d?(P=S[0].g,L.push("ofs="+P)):P=0:L.push("ofs="+P);let re=!0;for(let we=0;we<d;we++){let te=S[we].g,be=S[we].map;if(te-=P,0>te)P=Math.max(0,S[we].g-100),re=!1;else try{xd(be,L,"req"+te+"_");}catch(_unused22){m&&m(be);}}if(re){m=L.join("&");break e;}}}return i=i.i.splice(0,d),u.D=i,m;}function Jc(i){if(!i.g&&!i.u){i.Y=1;var u=i.Fa;Ue||Dr(),dt||(Ue(),dt=!0),je.add(u,i),i.v=0;}}function pi(i){return i.g||i.u||3<=i.v?!1:(i.Y++,i.u=Un(g(i.Fa,i),Zc(i,i.v)),i.v++,!0);}n.Fa=function(){if(this.u=null,Xc(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var i=2*this.R;this.j.info("BP detection timer enabled: "+i),this.A=Un(g(this.ab,this),i);}},n.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Ce(10),zr(this),Xc(this));};function yi(i){i.A!=null&&(c.clearTimeout(i.A),i.A=null);}function Xc(i){i.g=new mt(i,i.j,"rpc",i.Y),i.m===null&&(i.g.H=i.o),i.g.O=0;var u=Ze(i.qa);se(u,"RID","rpc"),se(u,"SID",i.K),se(u,"AID",i.T),se(u,"CI",i.F?"0":"1"),!i.F&&i.ja&&se(u,"TO",i.ja),se(u,"TYPE","xmlhttp"),Jn(i,u),i.m&&i.o&&mi(u,i.m,i.o),i.L&&(i.g.I=i.L);var d=i.g;i=i.ia,d.L=1,d.v=Ur(Ze(u)),d.m=null,d.P=!0,Ic(d,i);}n.Za=function(){this.C!=null&&(this.C=null,zr(this),pi(this),Ce(19));};function $r(i){i.C!=null&&(c.clearTimeout(i.C),i.C=null);}function Yc(i,u){var d=null;if(i.g==u){$r(i),yi(i),i.g=null;var m=2;}else if(di(i.h,u))d=u.D,Dc(i.h,u),m=1;else return;if(i.G!=0){if(u.o){if(m==1){d=u.m?u.m.length:0,u=Date.now()-u.F;var S=i.B;m=kr(),Ae(m,new vc(m,d)),jr(i);}else Jc(i);}else if(S=u.s,S==3||S==0&&0<u.X||!(m==1&&Od(i,u)||m==2&&pi(i)))switch(d&&0<d.length&&(u=i.h,u.i=u.i.concat(d)),S){case 1:Nt(i,5);break;case 4:Nt(i,10);break;case 3:Nt(i,6);break;default:Nt(i,2);}}}function Zc(i,u){let d=i.Ta+Math.floor(Math.random()*i.cb);return i.isActive()||(d*=2),d*u;}function Nt(i,u){if(i.j.info("Error code "+u),u==2){var d=g(i.fb,i),m=i.Xa;let S=!m;m=new Vt(m||"//www.google.com/images/cleardot.gif"),c.location&&c.location.protocol=="http"||Fr(m,"https"),Ur(m),S?Rd(m.toString(),d):Pd(m.toString(),d);}else Ce(2);i.G=0,i.l&&i.l.sa(u),eu(i),Hc(i);}n.fb=function(i){i?(this.j.info("Successfully pinged google.com"),Ce(2)):(this.j.info("Failed to ping google.com"),Ce(1));};function eu(i){if(i.G=0,i.ka=[],i.l){let u=xc(i.h);(u.length!=0||i.i.length!=0)&&(R(i.ka,u),R(i.ka,i.i),i.h.i.length=0,A(i.i),i.i.length=0),i.l.ra();}}function tu(i,u,d){var m=d instanceof Vt?Ze(d):new Vt(d);if(m.g!="")u&&(m.g=u+"."+m.g),Br(m,m.s);else{var S=c.location;m=S.protocol,u=u?u+"."+S.hostname:S.hostname,S=+S.port;var P=new Vt(null);m&&Fr(P,m),u&&(P.g=u),S&&Br(P,S),d&&(P.l=d),m=P;}return d=i.D,u=i.ya,d&&u&&se(m,d,u),se(m,"VER",i.la),Jn(i,m),m;}function nu(i,u,d){if(u&&!i.J)throw Error("Can't create secondary domain capable XhrIo object.");return u=i.Ca&&!i.pa?new ce(new qn({eb:d})):new ce(i.pa),u.Ha(i.J),u;}n.isActive=function(){return!!this.l&&this.l.isActive(this);};function ru(){}n=ru.prototype,n.ua=function(){},n.ta=function(){},n.sa=function(){},n.ra=function(){},n.isActive=function(){return!0;},n.Na=function(){};function qr(){}qr.prototype.g=function(i,u){return new xe(i,u);};function xe(i,u){Ee.call(this),this.g=new qc(u),this.l=i,this.h=u&&u.messageUrlParams||null,i=u&&u.messageHeaders||null,u&&u.clientProtocolHeaderRequired&&(i?i["X-Client-Protocol"]="webchannel":i={"X-Client-Protocol":"webchannel"}),this.g.o=i,i=u&&u.initMessageHeaders||null,u&&u.messageContentType&&(i?i["X-WebChannel-Content-Type"]=u.messageContentType:i={"X-WebChannel-Content-Type":u.messageContentType}),u&&u.va&&(i?i["X-WebChannel-Client-Profile"]=u.va:i={"X-WebChannel-Client-Profile":u.va}),this.g.S=i,(i=u&&u.Sb)&&!k(i)&&(this.g.m=i),this.v=u&&u.supportsCrossDomainXhr||!1,this.u=u&&u.sendRawJson||!1,(u=u&&u.httpSessionIdParam)&&!k(u)&&(this.g.D=u,i=this.h,i!==null&&u in i&&(i=this.h,u in i&&delete i[u])),this.j=new Wt(this);}C(xe,Ee),xe.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0);},xe.prototype.close=function(){gi(this.g);},xe.prototype.o=function(i){var u=this.g;if(typeof i=="string"){var d={};d.__data__=i,i=d;}else this.u&&(d={},d.__data__=ri(i),i=d);u.i.push(new wd(u.Ya++,i)),u.G==3&&jr(u);},xe.prototype.N=function(){this.g.l=null,delete this.j,gi(this.g),delete this.g,xe.aa.N.call(this);};function su(i){ii.call(this),i.__headers__&&(this.headers=i.__headers__,this.statusCode=i.__status__,delete i.__headers__,delete i.__status__);var u=i.__sm__;if(u){e:{for(let d in u){i=d;break e;}i=void 0;}(this.i=i)&&(i=this.i,u=u!==null&&i in u?u[i]:void 0),this.data=u;}else this.data=i;}C(su,ii);function iu(){oi.call(this),this.status=1;}C(iu,oi);function Wt(i){this.g=i;}C(Wt,ru),Wt.prototype.ua=function(){Ae(this.g,"a");},Wt.prototype.ta=function(i){Ae(this.g,new su(i));},Wt.prototype.sa=function(i){Ae(this.g,new iu());},Wt.prototype.ra=function(){Ae(this.g,"b");},qr.prototype.createWebChannel=qr.prototype.g,xe.prototype.send=xe.prototype.o,xe.prototype.open=xe.prototype.m,xe.prototype.close=xe.prototype.close,zi=it.createWebChannelTransport=function(){return new qr();},Gi=it.getStatEventTarget=function(){return kr();},Ki=it.Event=Dt,es=it.Stat={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},Or.NO_ERROR=0,Or.TIMEOUT=8,Or.HTTP_ERROR=6,nr=it.ErrorCode=Or,Ec.COMPLETE="complete",Ui=it.EventType=Ec,pc.EventType=Fn,Fn.OPEN="a",Fn.CLOSE="b",Fn.ERROR="c",Fn.MESSAGE="d",Ee.prototype.listen=Ee.prototype.K,Zt=it.WebChannel=pc,Yf=it.FetchXmlHttpFactory=qn,ce.prototype.listenOnce=ce.prototype.L,ce.prototype.getLastError=ce.prototype.Ka,ce.prototype.getLastErrorCode=ce.prototype.Ba,ce.prototype.getStatus=ce.prototype.Z,ce.prototype.getResponseJson=ce.prototype.Oa,ce.prototype.getResponseText=ce.prototype.oa,ce.prototype.send=ce.prototype.ea,ce.prototype.setWithCredentials=ce.prototype.Ha,Bi=it.XhrIo=ce;}).apply(typeof Zr<"u"?Zr:typeof self<"u"?self:typeof window<"u"?window:{});var Uu="@firebase/firestore",Ku="4.9.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var pe=class{constructor(e){this.uid=e;}isAuthenticated(){return this.uid!=null;}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user";}isEqual(e){return e.uid===this.uid;}};pe.UNAUTHENTICATED=new pe(null),pe.GOOGLE_CREDENTIALS=new pe("google-credentials-uid"),pe.FIRST_PARTY=new pe("first-party-uid"),pe.MOCK_USER=new pe("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Rn="12.0.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ft=new Yt("@firebase/firestore");function en(){return Ft.logLevel;}function U(n,...e){if(Ft.logLevel<=X.DEBUG){let t=e.map(Na);Ft.debug("Firestore (".concat(Rn,"): ").concat(n),...t);}}function at(n,...e){if(Ft.logLevel<=X.ERROR){let t=e.map(Na);Ft.error("Firestore (".concat(Rn,"): ").concat(n),...t);}}function cn(n,...e){if(Ft.logLevel<=X.WARN){let t=e.map(Na);Ft.warn("Firestore (".concat(Rn,"): ").concat(n),...t);}}function Na(n){if(typeof n=="string")return n;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return function(t){return JSON.stringify(t);}(n);}catch(_unused23){return n;}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function K(n,e,t){let r="Unexpected state";typeof e=="string"?r=e:t=e,Rl(n,r,t);}function Rl(n,e,t){let r="FIRESTORE (".concat(Rn,") INTERNAL ASSERTION FAILED: ").concat(e," (ID: ").concat(n.toString(16),")");if(t!==void 0)try{r+=" CONTEXT: "+JSON.stringify(t);}catch(_unused24){r+=" CONTEXT: "+t;}throw at(r),new Error(r);}function ee(n,e,t,r){let s="Unexpected state";typeof t=="string"?s=t:r=t,n||Rl(e,s,r);}function q(n,e){return n;}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var x={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"},B=class extends tt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>"".concat(this.name,": [code=").concat(this.code,"]: ").concat(this.message);}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Fe=class{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t;});}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var as=class{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map(),this.headers.set("Authorization","Bearer ".concat(e));}},Qi=class{getToken(){return Promise.resolve(null);}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(pe.UNAUTHENTICATED));}shutdown(){}},Wi=class{constructor(e){this.token=e,this.changeListener=null;}getToken(){return Promise.resolve(this.token);}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user));}shutdown(){this.changeListener=null;}},Ji=class{constructor(e){this.t=e,this.currentUser=pe.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null;}start(e,t){ee(this.o===void 0,42304);let r=this.i,s=l=>this.i!==r?(r=this.i,t(l)):Promise.resolve(),o=new Fe();this.o=()=>{this.i++,this.currentUser=this.u(),o.resolve(),o=new Fe(),e.enqueueRetryable(()=>s(this.currentUser));};let a=()=>{let l=o;e.enqueueRetryable(async()=>{await l.promise,await s(this.currentUser);});},c=l=>{U("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=l,this.o&&(this.auth.addAuthTokenListener(this.o),a());};this.t.onInit(l=>c(l)),setTimeout(()=>{if(!this.auth){let l=this.t.getImmediate({optional:!0});l?c(l):(U("FirebaseAuthCredentialsProvider","Auth not yet detected"),o.resolve(),o=new Fe());}},0),a();}getToken(){let e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(r=>this.i!==e?(U("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(ee(typeof r.accessToken=="string",31837,{l:r}),new as(r.accessToken,this.currentUser)):null):Promise.resolve(null);}invalidateToken(){this.forceRefresh=!0;}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0;}u(){let e=this.auth&&this.auth.getUid();return ee(e===null||typeof e=="string",2055,{h:e}),new pe(e);}},Xi=class{constructor(e,t,r){this.P=e,this.T=t,this.I=r,this.type="FirstParty",this.user=pe.FIRST_PARTY,this.A=new Map();}R(){return this.I?this.I():null;}get headers(){this.A.set("X-Goog-AuthUser",this.P);let e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A;}},Yi=class{constructor(e,t,r){this.P=e,this.T=t,this.I=r;}getToken(){return Promise.resolve(new Xi(this.P,this.T,this.I));}start(e,t){e.enqueueRetryable(()=>t(pe.FIRST_PARTY));}shutdown(){}invalidateToken(){}},cs=class{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map(),e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value);}},Zi=class{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,Nu(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken);}start(e,t){ee(this.o===void 0,3512);let r=o=>{o.error!=null&&U("FirebaseAppCheckTokenProvider","Error getting App Check token; using placeholder token instead. Error: ".concat(o.error.message));let a=o.token!==this.m;return this.m=o.token,U("FirebaseAppCheckTokenProvider","Received ".concat(a?"new":"existing"," token.")),a?t(o.token):Promise.resolve();};this.o=o=>{e.enqueueRetryable(()=>r(o));};let s=o=>{U("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=o,this.o&&this.appCheck.addTokenListener(this.o);};this.V.onInit(o=>s(o)),setTimeout(()=>{if(!this.appCheck){let o=this.V.getImmediate({optional:!0});o?s(o):U("FirebaseAppCheckTokenProvider","AppCheck not yet detected");}},0);}getToken(){if(this.p)return Promise.resolve(new cs(this.p));let e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(ee(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new cs(t.token)):null):Promise.resolve(null);}invalidateToken(){this.forceRefresh=!0;}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0;}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zf(n){let e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(n);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let r=0;r<n;r++)t[r]=Math.floor(256*Math.random());return t;}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var lr=class{static newId(){let e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516),r="";for(;r.length<20;){let s=Zf(40);for(let o=0;o<s.length;++o)r.length<20&&s[o]<t&&(r+=e.charAt(s[o]%62));}return r;}};function Q(n,e){return n<e?-1:n>e?1:0;}function eo(n,e){let t=Math.min(n.length,e.length);for(let r=0;r<t;r++){let s=n.charAt(r),o=e.charAt(r);if(s!==o)return ji(s)===ji(o)?Q(s,o):ji(s)?1:-1;}return Q(n.length,e.length);}var em=55296,tm=57343;function ji(n){let e=n.charCodeAt(0);return e>=em&&e<=tm;}function un(n,e,t){return n.length===e.length&&n.every((r,s)=>t(r,e[s]));}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Gu="__name__",us=class n{constructor(e,t,r){t===void 0?t=0:t>e.length&&K(637,{offset:t,range:e.length}),r===void 0?r=e.length-t:r>e.length-t&&K(1746,{length:r,range:e.length-t}),this.segments=e,this.offset=t,this.len=r;}get length(){return this.len;}isEqual(e){return n.comparator(this,e)===0;}child(e){let t=this.segments.slice(this.offset,this.limit());return e instanceof n?e.forEach(r=>{t.push(r);}):t.push(e),this.construct(t);}limit(){return this.offset+this.length;}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e);}popLast(){return this.construct(this.segments,this.offset,this.length-1);}firstSegment(){return this.segments[this.offset];}lastSegment(){return this.get(this.length-1);}get(e){return this.segments[this.offset+e];}isEmpty(){return this.length===0;}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0;}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0;}forEach(e){for(let t=this.offset,r=this.limit();t<r;t++)e(this.segments[t]);}toArray(){return this.segments.slice(this.offset,this.limit());}static comparator(e,t){let r=Math.min(e.length,t.length);for(let s=0;s<r;s++){let o=n.compareSegments(e.get(s),t.get(s));if(o!==0)return o;}return Q(e.length,t.length);}static compareSegments(e,t){let r=n.isNumericId(e),s=n.isNumericId(t);return r&&!s?-1:!r&&s?1:r&&s?n.extractNumericId(e).compare(n.extractNumericId(t)):eo(e,t);}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__");}static extractNumericId(e){return st.fromString(e.substring(4,e.length-2));}},ie=class n extends us{construct(e,t,r){return new n(e,t,r);}canonicalString(){return this.toArray().join("/");}toString(){return this.canonicalString();}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/");}static fromString(...e){let t=[];for(let r of e){if(r.indexOf("//")>=0)throw new B(x.INVALID_ARGUMENT,"Invalid segment (".concat(r,"). Paths must not contain // in them."));t.push(...r.split("/").filter(s=>s.length>0));}return new n(t);}static emptyPath(){return new n([]);}},nm=/^[_a-zA-Z][_a-zA-Z0-9]*$/,Ne=class n extends us{construct(e,t,r){return new n(e,t,r);}static isValidIdentifier(e){return nm.test(e);}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),n.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".");}toString(){return this.canonicalString();}isKeyField(){return this.length===1&&this.get(0)===Gu;}static keyField(){return new n([Gu]);}static fromServerFormat(e){let t=[],r="",s=0,o=()=>{if(r.length===0)throw new B(x.INVALID_ARGUMENT,"Invalid field path (".concat(e,"). Paths must not be empty, begin with '.', end with '.', or contain '..'"));t.push(r),r="";},a=!1;for(;s<e.length;){let c=e[s];if(c==="\\"){if(s+1===e.length)throw new B(x.INVALID_ARGUMENT,"Path has trailing escape character: "+e);let l=e[s+1];if(l!=="\\"&&l!=="."&&l!=="`")throw new B(x.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=l,s+=2;}else c==="`"?(a=!a,s++):c!=="."||a?(r+=c,s++):(o(),s++);}if(o(),a)throw new B(x.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new n(t);}static emptyPath(){return new n([]);}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var j=class n{constructor(e){this.path=e;}static fromPath(e){return new n(ie.fromString(e));}static fromName(e){return new n(ie.fromString(e).popFirst(5));}static empty(){return new n(ie.emptyPath());}get collectionGroup(){return this.path.popLast().lastSegment();}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e;}getCollectionGroup(){return this.path.get(this.path.length-2);}getCollectionPath(){return this.path.popLast();}isEqual(e){return e!==null&&ie.comparator(this.path,e.path)===0;}toString(){return this.path.toString();}static comparator(e,t){return ie.comparator(e.path,t.path);}static isDocumentKey(e){return e.length%2==0;}static fromSegments(e){return new n(new ie(e.slice()));}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pl(n,e,t){if(!t)throw new B(x.INVALID_ARGUMENT,"Function ".concat(n,"() cannot be called with an empty ").concat(e,"."));}function rm(n,e,t,r){if(e===!0&&r===!0)throw new B(x.INVALID_ARGUMENT,"".concat(n," and ").concat(t," cannot be used together."));}function zu(n){if(!j.isDocumentKey(n))throw new B(x.INVALID_ARGUMENT,"Invalid document reference. Document references must have an even number of segments, but ".concat(n," has ").concat(n.length,"."));}function ju(n){if(j.isDocumentKey(n))throw new B(x.INVALID_ARGUMENT,"Invalid collection reference. Collection references must have an odd number of segments, but ".concat(n," has ").concat(n.length,"."));}function Dl(n){return typeof n=="object"&&n!==null&&(Object.getPrototypeOf(n)===Object.prototype||Object.getPrototypeOf(n)===null);}function ka(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n="".concat(n.substring(0,20),"...")),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{let e=function(r){return r.constructor?r.constructor.name:null;}(n);return e?"a custom ".concat(e," object"):"an object";}}return typeof n=="function"?"a function":K(12329,{type:typeof n});}function Pe(n,e){if("_delegate"in n&&(n=n._delegate),!(n instanceof e)){if(e.name===n.constructor.name)throw new B(x.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{let t=ka(n);throw new B(x.INVALID_ARGUMENT,"Expected type '".concat(e.name,"', but it was: ").concat(t));}}return n;}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function de(n,e){let t={typeString:n};return e&&(t.value=e),t;}function Ir(n,e){if(!Dl(n))throw new B(x.INVALID_ARGUMENT,"JSON must be an object");let t;for(let r in e)if(e[r]){let s=e[r].typeString,o="value"in e[r]?{value:e[r].value}:void 0;if(!(r in n)){t="JSON missing required field: '".concat(r,"'");break;}let a=n[r];if(s&&typeof a!==s){t="JSON field '".concat(r,"' must be a ").concat(s,".");break;}if(o!==void 0&&a!==o.value){t="Expected '".concat(r,"' field to equal '").concat(o.value,"'");break;}}if(t)throw new B(x.INVALID_ARGUMENT,t);return!0;}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var $u=-62135596800,qu=1e6,fe=class n{static now(){return n.fromMillis(Date.now());}static fromDate(e){return n.fromMillis(e.getTime());}static fromMillis(e){let t=Math.floor(e/1e3),r=Math.floor((e-1e3*t)*qu);return new n(t,r);}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new B(x.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new B(x.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<$u)throw new B(x.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new B(x.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);}toDate(){return new Date(this.toMillis());}toMillis(){return 1e3*this.seconds+this.nanoseconds/qu;}_compareTo(e){return this.seconds===e.seconds?Q(this.nanoseconds,e.nanoseconds):Q(this.seconds,e.seconds);}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds;}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")";}toJSON(){return{type:n._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds};}static fromJSON(e){if(Ir(e,n._jsonSchema))return new n(e.seconds,e.nanoseconds);}valueOf(){let e=this.seconds-$u;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0");}};fe._jsonSchemaVersion="firestore/timestamp/1.0",fe._jsonSchema={type:de("string",fe._jsonSchemaVersion),seconds:de("number"),nanoseconds:de("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var $=class n{static fromTimestamp(e){return new n(e);}static min(){return new n(new fe(0,0));}static max(){return new n(new fe(253402300799,999999999));}constructor(e){this.timestamp=e;}compareTo(e){return this.timestamp._compareTo(e.timestamp);}isEqual(e){return this.timestamp.isEqual(e.timestamp);}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3;}toString(){return"SnapshotVersion("+this.timestamp.toString()+")";}toTimestamp(){return this.timestamp;}};/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var hr=-1,to=class{constructor(e,t,r,s){this.indexId=e,this.collectionGroup=t,this.fields=r,this.indexState=s;}};to.UNKNOWN_ID=-1;function sm(n,e){let t=n.toTimestamp().seconds,r=n.toTimestamp().nanoseconds+1,s=$.fromTimestamp(r===1e9?new fe(t+1,0):new fe(t,r));return new Bt(s,j.empty(),e);}function im(n){return new Bt(n.readTime,n.key,hr);}var Bt=class n{constructor(e,t,r){this.readTime=e,this.documentKey=t,this.largestBatchId=r;}static min(){return new n($.min(),j.empty(),hr);}static max(){return new n($.max(),j.empty(),hr);}};function om(n,e){let t=n.readTime.compareTo(e.readTime);return t!==0?t:(t=j.comparator(n.documentKey,e.documentKey),t!==0?t:Q(n.largestBatchId,e.largestBatchId));}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var am="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.",no=class{constructor(){this.onCommittedListeners=[];}addOnCommittedListener(e){this.onCommittedListeners.push(e);}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e());}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Pn(n){if(n.code!==x.FAILED_PRECONDITION||n.message!==am)throw n;U("LocalStore","Unexpectedly lost primary lease");}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var N=class n{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t);},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t);});}catch(e){return this.next(void 0,e);}next(e,t){return this.callbackAttached&&K(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new n((r,s)=>{this.nextCallback=o=>{this.wrapSuccess(e,o).next(r,s);},this.catchCallback=o=>{this.wrapFailure(t,o).next(r,s);};});}toPromise(){return new Promise((e,t)=>{this.next(e,t);});}wrapUserFunction(e){try{let t=e();return t instanceof n?t:n.resolve(t);}catch(t){return n.reject(t);}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):n.resolve(t);}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):n.reject(t);}static resolve(e){return new n((t,r)=>{t(e);});}static reject(e){return new n((t,r)=>{r(e);});}static waitFor(e){return new n((t,r)=>{let s=0,o=0,a=!1;e.forEach(c=>{++s,c.next(()=>{++o,a&&o===s&&t();},l=>r(l));}),a=!0,o===s&&t();});}static or(e){let t=n.resolve(!1);for(let r of e)t=t.next(s=>s?n.resolve(s):r());return t;}static forEach(e,t){let r=[];return e.forEach((s,o)=>{r.push(t.call(this,s,o));}),this.waitFor(r);}static mapArray(e,t){return new n((r,s)=>{let o=e.length,a=new Array(o),c=0;for(let l=0;l<o;l++){let h=l;t(e[h]).next(f=>{a[h]=f,++c,c===o&&r(a);},f=>s(f));}});}static doWhile(e,t){return new n((r,s)=>{let o=()=>{e()===!0?t().next(()=>{o();},s):r();};o();});}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cm(n){let e=n.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t);}function Dn(n){return n.name==="IndexedDbTransactionError";}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ln=class{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=r=>this.ae(r),this.ue=r=>t.writeSequenceNumber(r));}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue;}next(){let e=++this.previousValue;return this.ue&&this.ue(e),e;}};ln.ce=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Oa=-1;function Sr(n){return n==null;}function dr(n){return n===0&&1/n==-1/0;}function um(n){return typeof n=="number"&&Number.isInteger(n)&&!dr(n)&&n<=Number.MAX_SAFE_INTEGER&&n>=Number.MIN_SAFE_INTEGER;}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var xl="";function lm(n){let e="";for(let t=0;t<n.length;t++)e.length>0&&(e=Hu(e)),e=hm(n.get(t),e);return Hu(e);}function hm(n,e){let t=e,r=n.length;for(let s=0;s<r;s++){let o=n.charAt(s);switch(o){case"\0":t+="";break;case xl:t+="";break;default:t+=o;}}return t;}function Hu(n){return n+xl+"";}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var dm="remoteDocuments",Vl="owner";var Nl="mutationQueues";var kl="mutations";/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ol="documentMutations",fm="remoteDocumentsV14";var Ll="remoteDocumentGlobal";var Ml="targets";var Fl="targetDocuments";var Bl="targetGlobal",Ul="collectionParents";var Kl="clientMetadata";var Gl="bundles";var zl="namedQueries";var mm="indexConfiguration";var gm="indexState";var pm="indexEntries";var jl="documentOverlays";var ym="globals";var wm=[Nl,kl,Ol,dm,Ml,Vl,Bl,Fl,Kl,Ll,Ul,Gl,zl],Kp=[...wm,jl],_m=[Nl,kl,Ol,fm,Ml,Vl,Bl,Fl,Kl,Ll,Ul,Gl,zl,jl],vm=_m,Em=[...vm,mm,gm,pm];var Gp=[...Em,ym];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qu(n){let e=0;for(let t in n)Object.prototype.hasOwnProperty.call(n,t)&&e++;return e;}function Ct(n,e){for(let t in n)Object.prototype.hasOwnProperty.call(n,t)&&e(t,n[t]);}function $l(n){for(let e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0;}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ue=class n{constructor(e,t){this.comparator=e,this.root=t||qe.EMPTY;}insert(e,t){return new n(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,qe.BLACK,null,null));}remove(e){return new n(this.comparator,this.root.remove(e,this.comparator).copy(null,null,qe.BLACK,null,null));}get(e){let t=this.root;for(;!t.isEmpty();){let r=this.comparator(e,t.key);if(r===0)return t.value;r<0?t=t.left:r>0&&(t=t.right);}return null;}indexOf(e){let t=0,r=this.root;for(;!r.isEmpty();){let s=this.comparator(e,r.key);if(s===0)return t+r.left.size;s<0?r=r.left:(t+=r.left.size+1,r=r.right);}return-1;}isEmpty(){return this.root.isEmpty();}get size(){return this.root.size;}minKey(){return this.root.minKey();}maxKey(){return this.root.maxKey();}inorderTraversal(e){return this.root.inorderTraversal(e);}forEach(e){this.inorderTraversal((t,r)=>(e(t,r),!1));}toString(){let e=[];return this.inorderTraversal((t,r)=>(e.push("".concat(t,":").concat(r)),!1)),"{".concat(e.join(", "),"}");}reverseTraversal(e){return this.root.reverseTraversal(e);}getIterator(){return new sn(this.root,null,this.comparator,!1);}getIteratorFrom(e){return new sn(this.root,e,this.comparator,!1);}getReverseIterator(){return new sn(this.root,null,this.comparator,!0);}getReverseIteratorFrom(e){return new sn(this.root,e,this.comparator,!0);}},sn=class{constructor(e,t,r,s){this.isReverse=s,this.nodeStack=[];let o=1;for(;!e.isEmpty();)if(o=t?r(e.key,t):1,t&&s&&(o*=-1),o<0)e=this.isReverse?e.left:e.right;else{if(o===0){this.nodeStack.push(e);break;}this.nodeStack.push(e),e=this.isReverse?e.right:e.left;}}getNext(){let e=this.nodeStack.pop(),t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t;}hasNext(){return this.nodeStack.length>0;}peek(){if(this.nodeStack.length===0)return null;let e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value};}},qe=class n{constructor(e,t,r,s,o){this.key=e,this.value=t,this.color=r!==null&&r!==void 0?r:n.RED,this.left=s!==null&&s!==void 0?s:n.EMPTY,this.right=o!==null&&o!==void 0?o:n.EMPTY,this.size=this.left.size+1+this.right.size;}copy(e,t,r,s,o){return new n(e!==null&&e!==void 0?e:this.key,t!==null&&t!==void 0?t:this.value,r!==null&&r!==void 0?r:this.color,s!==null&&s!==void 0?s:this.left,o!==null&&o!==void 0?o:this.right);}isEmpty(){return!1;}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e);}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e);}min(){return this.left.isEmpty()?this:this.left.min();}minKey(){return this.min().key;}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey();}insert(e,t,r){let s=this,o=r(e,s.key);return s=o<0?s.copy(null,null,null,s.left.insert(e,t,r),null):o===0?s.copy(null,t,null,null,null):s.copy(null,null,null,null,s.right.insert(e,t,r)),s.fixUp();}removeMin(){if(this.left.isEmpty())return n.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp();}remove(e,t){let r,s=this;if(t(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,t),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),t(e,s.key)===0){if(s.right.isEmpty())return n.EMPTY;r=s.right.min(),s=s.copy(r.key,r.value,null,null,s.right.removeMin());}s=s.copy(null,null,null,null,s.right.remove(e,t));}return s.fixUp();}isRed(){return this.color;}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e;}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e;}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e;}rotateLeft(){let e=this.copy(null,null,n.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null);}rotateRight(){let e=this.copy(null,null,n.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e);}colorFlip(){let e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t);}checkMaxDepth(){let e=this.check();return Math.pow(2,e)<=this.size+1;}check(){if(this.isRed()&&this.left.isRed())throw K(43730,{key:this.key,value:this.value});if(this.right.isRed())throw K(14113,{key:this.key,value:this.value});let e=this.left.check();if(e!==this.right.check())throw K(27949);return e+(this.isRed()?0:1);}};qe.EMPTY=null,qe.RED=!0,qe.BLACK=!1;qe.EMPTY=new class{constructor(){this.size=0;}get key(){throw K(57766);}get value(){throw K(16141);}get color(){throw K(16727);}get left(){throw K(29726);}get right(){throw K(36894);}copy(e,t,r,s,o){return this;}insert(e,t,r){return new qe(e,t);}remove(e,t){return this;}isEmpty(){return!0;}inorderTraversal(e){return!1;}reverseTraversal(e){return!1;}minKey(){return null;}maxKey(){return null;}isRed(){return!1;}checkMaxDepth(){return!0;}check(){return 0;}}();/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ye=class n{constructor(e){this.comparator=e,this.data=new ue(this.comparator);}has(e){return this.data.get(e)!==null;}first(){return this.data.minKey();}last(){return this.data.maxKey();}get size(){return this.data.size;}indexOf(e){return this.data.indexOf(e);}forEach(e){this.data.inorderTraversal((t,r)=>(e(t),!1));}forEachInRange(e,t){let r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){let s=r.getNext();if(this.comparator(s.key,e[1])>=0)return;t(s.key);}}forEachWhile(e,t){let r;for(r=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return;}firstAfterOrEqual(e){let t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null;}getIterator(){return new ls(this.data.getIterator());}getIteratorFrom(e){return new ls(this.data.getIteratorFrom(e));}add(e){return this.copy(this.data.remove(e).insert(e,!0));}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this;}isEmpty(){return this.data.isEmpty();}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(r=>{t=t.add(r);}),t;}isEqual(e){if(!(e instanceof n)||this.size!==e.size)return!1;let t=this.data.getIterator(),r=e.data.getIterator();for(;t.hasNext();){let s=t.getNext().key,o=r.getNext().key;if(this.comparator(s,o)!==0)return!1;}return!0;}toArray(){let e=[];return this.forEach(t=>{e.push(t);}),e;}toString(){let e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")";}copy(e){let t=new n(this.comparator);return t.data=e,t;}},ls=class{constructor(e){this.iter=e;}getNext(){return this.iter.getNext().key;}hasNext(){return this.iter.hasNext();}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Me=class n{constructor(e){this.fields=e,e.sort(Ne.comparator);}static empty(){return new n([]);}unionWith(e){let t=new ye(Ne.comparator);for(let r of this.fields)t=t.add(r);for(let r of e)t=t.add(r);return new n(t.toArray());}covers(e){for(let t of this.fields)if(t.isPrefixOf(e))return!0;return!1;}isEqual(e){return un(this.fields,e.fields,(t,r)=>t.isEqual(r));}};/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var hs=class extends Error{constructor(){super(...arguments),this.name="Base64DecodeError";}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Se=class n{constructor(e){this.binaryString=e;}static fromBase64String(e){let t=function(s){try{return atob(s);}catch(o){throw typeof DOMException<"u"&&o instanceof DOMException?new hs("Invalid base64 string: "+o):o;}}(e);return new n(t);}static fromUint8Array(e){let t=function(s){let o="";for(let a=0;a<s.length;++a)o+=String.fromCharCode(s[a]);return o;}(e);return new n(t);}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}};}toBase64(){return function(t){return btoa(t);}(this.binaryString);}toUint8Array(){return function(t){let r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r;}(this.binaryString);}approximateByteSize(){return 2*this.binaryString.length;}compareTo(e){return Q(this.binaryString,e.binaryString);}isEqual(e){return this.binaryString===e.binaryString;}};Se.EMPTY_BYTE_STRING=new Se("");var bm=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function ct(n){if(ee(!!n,39018),typeof n=="string"){let e=0,t=bm.exec(n);if(ee(!!t,46558,{timestamp:n}),t[1]){let s=t[1];s=(s+"000000000").substr(0,9),e=Number(s);}let r=new Date(n);return{seconds:Math.floor(r.getTime()/1e3),nanos:e};}return{seconds:oe(n.seconds),nanos:oe(n.nanos)};}function oe(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0;}function ut(n){return typeof n=="string"?Se.fromBase64String(n):Se.fromUint8Array(n);}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ql="server_timestamp",Hl="__type__",Ql="__previous_value__",Wl="__local_write_time__";function La(n){var _Hl,_n$mapValue;return((_Hl=((n===null||n===void 0||(_n$mapValue=n.mapValue)===null||_n$mapValue===void 0?void 0:_n$mapValue.fields)||{})[Hl])===null||_Hl===void 0?void 0:_Hl.stringValue)===ql;}function Us(n){let e=n.mapValue.fields[Ql];return La(e)?Us(e):e;}function fr(n){let e=ct(n.mapValue.fields[Wl].timestampValue);return new fe(e.seconds,e.nanos);}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ro=class{constructor(e,t,r,s,o,a,c,l,h,f){this.databaseId=e,this.appId=t,this.persistenceKey=r,this.host=s,this.ssl=o,this.forceLongPolling=a,this.autoDetectLongPolling=c,this.longPollingOptions=l,this.useFetchStreams=h,this.isUsingEmulator=f;}},ds="(default)",fs=class n{constructor(e,t){this.projectId=e,this.database=t||ds;}static empty(){return new n("","");}get isDefaultDatabase(){return this.database===ds;}isEqual(e){return e instanceof n&&e.projectId===this.projectId&&e.database===this.database;}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ma="__type__",Jl="__max__",ts={mapValue:{fields:{__type__:{stringValue:Jl}}}},Fa="__vector__",hn="value";function It(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?La(n)?4:Yl(n)?9007199254740991:Xl(n)?10:11:K(28295,{value:n});}function Qe(n,e){if(n===e)return!0;let t=It(n);if(t!==It(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===e.booleanValue;case 4:return fr(n).isEqual(fr(e));case 3:return function(s,o){if(typeof s.timestampValue=="string"&&typeof o.timestampValue=="string"&&s.timestampValue.length===o.timestampValue.length)return s.timestampValue===o.timestampValue;let a=ct(s.timestampValue),c=ct(o.timestampValue);return a.seconds===c.seconds&&a.nanos===c.nanos;}(n,e);case 5:return n.stringValue===e.stringValue;case 6:return function(s,o){return ut(s.bytesValue).isEqual(ut(o.bytesValue));}(n,e);case 7:return n.referenceValue===e.referenceValue;case 8:return function(s,o){return oe(s.geoPointValue.latitude)===oe(o.geoPointValue.latitude)&&oe(s.geoPointValue.longitude)===oe(o.geoPointValue.longitude);}(n,e);case 2:return function(s,o){if("integerValue"in s&&"integerValue"in o)return oe(s.integerValue)===oe(o.integerValue);if("doubleValue"in s&&"doubleValue"in o){let a=oe(s.doubleValue),c=oe(o.doubleValue);return a===c?dr(a)===dr(c):isNaN(a)&&isNaN(c);}return!1;}(n,e);case 9:return un(n.arrayValue.values||[],e.arrayValue.values||[],Qe);case 10:case 11:return function(s,o){let a=s.mapValue.fields||{},c=o.mapValue.fields||{};if(Qu(a)!==Qu(c))return!1;for(let l in a)if(a.hasOwnProperty(l)&&(c[l]===void 0||!Qe(a[l],c[l])))return!1;return!0;}(n,e);default:return K(52216,{left:n});}}function mr(n,e){return(n.values||[]).find(t=>Qe(t,e))!==void 0;}function dn(n,e){if(n===e)return 0;let t=It(n),r=It(e);if(t!==r)return Q(t,r);switch(t){case 0:case 9007199254740991:return 0;case 1:return Q(n.booleanValue,e.booleanValue);case 2:return function(o,a){let c=oe(o.integerValue||o.doubleValue),l=oe(a.integerValue||a.doubleValue);return c<l?-1:c>l?1:c===l?0:isNaN(c)?isNaN(l)?0:-1:1;}(n,e);case 3:return Wu(n.timestampValue,e.timestampValue);case 4:return Wu(fr(n),fr(e));case 5:return eo(n.stringValue,e.stringValue);case 6:return function(o,a){let c=ut(o),l=ut(a);return c.compareTo(l);}(n.bytesValue,e.bytesValue);case 7:return function(o,a){let c=o.split("/"),l=a.split("/");for(let h=0;h<c.length&&h<l.length;h++){let f=Q(c[h],l[h]);if(f!==0)return f;}return Q(c.length,l.length);}(n.referenceValue,e.referenceValue);case 8:return function(o,a){let c=Q(oe(o.latitude),oe(a.latitude));return c!==0?c:Q(oe(o.longitude),oe(a.longitude));}(n.geoPointValue,e.geoPointValue);case 9:return Ju(n.arrayValue,e.arrayValue);case 10:return function(o,a,_c$hn,_l$hn,_h$values,_f$values){let c=o.fields||{},l=a.fields||{},h=(_c$hn=c[hn])===null||_c$hn===void 0?void 0:_c$hn.arrayValue,f=(_l$hn=l[hn])===null||_l$hn===void 0?void 0:_l$hn.arrayValue,p=Q((h===null||h===void 0||(_h$values=h.values)===null||_h$values===void 0?void 0:_h$values.length)||0,(f===null||f===void 0||(_f$values=f.values)===null||_f$values===void 0?void 0:_f$values.length)||0);return p!==0?p:Ju(h,f);}(n.mapValue,e.mapValue);case 11:return function(o,a){if(o===ts.mapValue&&a===ts.mapValue)return 0;if(o===ts.mapValue)return 1;if(a===ts.mapValue)return-1;let c=o.fields||{},l=Object.keys(c),h=a.fields||{},f=Object.keys(h);l.sort(),f.sort();for(let p=0;p<l.length&&p<f.length;++p){let g=eo(l[p],f[p]);if(g!==0)return g;let T=dn(c[l[p]],h[f[p]]);if(T!==0)return T;}return Q(l.length,f.length);}(n.mapValue,e.mapValue);default:throw K(23264,{he:t});}}function Wu(n,e){if(typeof n=="string"&&typeof e=="string"&&n.length===e.length)return Q(n,e);let t=ct(n),r=ct(e),s=Q(t.seconds,r.seconds);return s!==0?s:Q(t.nanos,r.nanos);}function Ju(n,e){let t=n.values||[],r=e.values||[];for(let s=0;s<t.length&&s<r.length;++s){let o=dn(t[s],r[s]);if(o)return o;}return Q(t.length,r.length);}function fn(n){return so(n);}function so(n){return"nullValue"in n?"null":"booleanValue"in n?""+n.booleanValue:"integerValue"in n?""+n.integerValue:"doubleValue"in n?""+n.doubleValue:"timestampValue"in n?function(t){let r=ct(t);return"time(".concat(r.seconds,",").concat(r.nanos,")");}(n.timestampValue):"stringValue"in n?n.stringValue:"bytesValue"in n?function(t){return ut(t).toBase64();}(n.bytesValue):"referenceValue"in n?function(t){return j.fromName(t).toString();}(n.referenceValue):"geoPointValue"in n?function(t){return"geo(".concat(t.latitude,",").concat(t.longitude,")");}(n.geoPointValue):"arrayValue"in n?function(t){let r="[",s=!0;for(let o of t.values||[])s?s=!1:r+=",",r+=so(o);return r+"]";}(n.arrayValue):"mapValue"in n?function(t){let r=Object.keys(t.fields||{}).sort(),s="{",o=!0;for(let a of r)o?o=!1:s+=",",s+="".concat(a,":").concat(so(t.fields[a]));return s+"}";}(n.mapValue):K(61005,{value:n});}function ss(n){switch(It(n)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:let e=Us(n);return e?16+ss(e):16;case 5:return 2*n.stringValue.length;case 6:return ut(n.bytesValue).approximateByteSize();case 7:return n.referenceValue.length;case 9:return function(r){return(r.values||[]).reduce((s,o)=>s+ss(o),0);}(n.arrayValue);case 10:case 11:return function(r){let s=0;return Ct(r.fields,(o,a)=>{s+=o.length+ss(a);}),s;}(n.mapValue);default:throw K(13486,{value:n});}}function io(n){return!!n&&"integerValue"in n;}function Ba(n){return!!n&&"arrayValue"in n;}function Xu(n){return!!n&&"nullValue"in n;}function Yu(n){return!!n&&"doubleValue"in n&&isNaN(Number(n.doubleValue));}function is(n){return!!n&&"mapValue"in n;}function Xl(n){var _Ma,_n$mapValue2;return((_Ma=((n===null||n===void 0||(_n$mapValue2=n.mapValue)===null||_n$mapValue2===void 0?void 0:_n$mapValue2.fields)||{})[Ma])===null||_Ma===void 0?void 0:_Ma.stringValue)===Fa;}function ir(n){if(n.geoPointValue)return{geoPointValue:{...n.geoPointValue}};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:{...n.timestampValue}};if(n.mapValue){let e={mapValue:{fields:{}}};return Ct(n.mapValue.fields,(t,r)=>e.mapValue.fields[t]=ir(r)),e;}if(n.arrayValue){let e={arrayValue:{values:[]}};for(let t=0;t<(n.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=ir(n.arrayValue.values[t]);return e;}return{...n};}function Yl(n){return(((n.mapValue||{}).fields||{}).__type__||{}).stringValue===Jl;}var jp={mapValue:{fields:{[Ma]:{stringValue:Fa},[hn]:{arrayValue:{}}}}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Re=class n{constructor(e){this.value=e;}static empty(){return new n({mapValue:{}});}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let r=0;r<e.length-1;++r)if(t=(t.mapValue.fields||{})[e.get(r)],!is(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null;}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=ir(t);}setAll(e){let t=Ne.emptyPath(),r={},s=[];e.forEach((a,c)=>{if(!t.isImmediateParentOf(c)){let l=this.getFieldsMap(t);this.applyChanges(l,r,s),r={},s=[],t=c.popLast();}a?r[c.lastSegment()]=ir(a):s.push(c.lastSegment());});let o=this.getFieldsMap(t);this.applyChanges(o,r,s);}delete(e){let t=this.field(e.popLast());is(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()];}isEqual(e){return Qe(this.value,e.value);}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let r=0;r<e.length;++r){let s=t.mapValue.fields[e.get(r)];is(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},t.mapValue.fields[e.get(r)]=s),t=s;}return t.mapValue.fields;}applyChanges(e,t,r){Ct(t,(s,o)=>e[s]=o);for(let s of r)delete e[s];}clone(){return new n(ir(this.value));}};function Zl(n){let e=[];return Ct(n.fields,(t,r)=>{let s=new Ne([t]);if(is(r)){let o=Zl(r.mapValue).fields;if(o.length===0)e.push(s);else for(let a of o)e.push(s.child(a));}else e.push(s);}),new Me(e);}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Oe=class n{constructor(e,t,r,s,o,a,c){this.key=e,this.documentType=t,this.version=r,this.readTime=s,this.createTime=o,this.data=a,this.documentState=c;}static newInvalidDocument(e){return new n(e,0,$.min(),$.min(),$.min(),Re.empty(),0);}static newFoundDocument(e,t,r,s){return new n(e,1,t,$.min(),r,s,0);}static newNoDocument(e,t){return new n(e,2,t,$.min(),$.min(),Re.empty(),0);}static newUnknownDocument(e,t){return new n(e,3,t,$.min(),$.min(),Re.empty(),2);}convertToFoundDocument(e,t){return!this.createTime.isEqual($.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this;}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Re.empty(),this.documentState=0,this;}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Re.empty(),this.documentState=2,this;}setHasCommittedMutations(){return this.documentState=2,this;}setHasLocalMutations(){return this.documentState=1,this.version=$.min(),this;}setReadTime(e){return this.readTime=e,this;}get hasLocalMutations(){return this.documentState===1;}get hasCommittedMutations(){return this.documentState===2;}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations;}isValidDocument(){return this.documentType!==0;}isFoundDocument(){return this.documentType===1;}isNoDocument(){return this.documentType===2;}isUnknownDocument(){return this.documentType===3;}isEqual(e){return e instanceof n&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data);}mutableCopy(){return new n(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState);}toString(){return"Document(".concat(this.key,", ").concat(this.version,", ").concat(JSON.stringify(this.data.value),", {createTime: ").concat(this.createTime,"}), {documentType: ").concat(this.documentType,"}), {documentState: ").concat(this.documentState,"})");}};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var mn=class{constructor(e,t){this.position=e,this.inclusive=t;}};function Zu(n,e,t){let r=0;for(let s=0;s<n.position.length;s++){let o=e[s],a=n.position[s];if(o.field.isKeyField()?r=j.comparator(j.fromName(a.referenceValue),t.key):r=dn(a,t.data.field(o.field)),o.dir==="desc"&&(r*=-1),r!==0)break;}return r;}function el(n,e){if(n===null)return e===null;if(e===null||n.inclusive!==e.inclusive||n.position.length!==e.position.length)return!1;for(let t=0;t<n.position.length;t++)if(!Qe(n.position[t],e.position[t]))return!1;return!0;}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var gn=class{constructor(e,t="asc"){this.field=e,this.dir=t;}};function Tm(n,e){return n.dir===e.dir&&n.field.isEqual(e.field);}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ms=class{},me=class n extends ms{constructor(e,t,r){super(),this.field=e,this.op=t,this.value=r;}static create(e,t,r){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,r):new ao(e,t,r):t==="array-contains"?new lo(e,r):t==="in"?new ho(e,r):t==="not-in"?new fo(e,r):t==="array-contains-any"?new mo(e,r):new n(e,t,r);}static createKeyFieldInFilter(e,t,r){return t==="in"?new co(e,r):new uo(e,r);}matches(e){let t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(dn(t,this.value)):t!==null&&It(this.value)===It(t)&&this.matchesComparison(dn(t,this.value));}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return K(47266,{operator:this.op});}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0;}getFlattenedFilters(){return[this];}getFilters(){return[this];}},We=class n extends ms{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null;}static create(e,t){return new n(e,t);}matches(e){return eh(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0;}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe;}getFilters(){return Object.assign([],this.filters);}};function eh(n){return n.op==="and";}function th(n){return Im(n)&&eh(n);}function Im(n){for(let e of n.filters)if(e instanceof We)return!1;return!0;}function oo(n){if(n instanceof me)return n.field.canonicalString()+n.op.toString()+fn(n.value);if(th(n))return n.filters.map(e=>oo(e)).join(",");{let e=n.filters.map(t=>oo(t)).join(",");return"".concat(n.op,"(").concat(e,")");}}function nh(n,e){return n instanceof me?function(r,s){return s instanceof me&&r.op===s.op&&r.field.isEqual(s.field)&&Qe(r.value,s.value);}(n,e):n instanceof We?function(r,s){return s instanceof We&&r.op===s.op&&r.filters.length===s.filters.length?r.filters.reduce((o,a,c)=>o&&nh(a,s.filters[c]),!0):!1;}(n,e):void K(19439);}function rh(n){return n instanceof me?function(t){return"".concat(t.field.canonicalString()," ").concat(t.op," ").concat(fn(t.value));}(n):n instanceof We?function(t){return t.op.toString()+" {"+t.getFilters().map(rh).join(" ,")+"}";}(n):"Filter";}var ao=class extends me{constructor(e,t,r){super(e,t,r),this.key=j.fromName(r.referenceValue);}matches(e){let t=j.comparator(e.key,this.key);return this.matchesComparison(t);}},co=class extends me{constructor(e,t){super(e,"in",t),this.keys=sh("in",t);}matches(e){return this.keys.some(t=>t.isEqual(e.key));}},uo=class extends me{constructor(e,t){super(e,"not-in",t),this.keys=sh("not-in",t);}matches(e){return!this.keys.some(t=>t.isEqual(e.key));}};function sh(n,e){var _e$arrayValue;return(((_e$arrayValue=e.arrayValue)===null||_e$arrayValue===void 0?void 0:_e$arrayValue.values)||[]).map(t=>j.fromName(t.referenceValue));}var lo=class extends me{constructor(e,t){super(e,"array-contains",t);}matches(e){let t=e.data.field(this.field);return Ba(t)&&mr(t.arrayValue,this.value);}},ho=class extends me{constructor(e,t){super(e,"in",t);}matches(e){let t=e.data.field(this.field);return t!==null&&mr(this.value.arrayValue,t);}},fo=class extends me{constructor(e,t){super(e,"not-in",t);}matches(e){if(mr(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;let t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!mr(this.value.arrayValue,t);}},mo=class extends me{constructor(e,t){super(e,"array-contains-any",t);}matches(e){let t=e.data.field(this.field);return!(!Ba(t)||!t.arrayValue.values)&&t.arrayValue.values.some(r=>mr(this.value.arrayValue,r));}};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var go=class{constructor(e,t=null,r=[],s=[],o=null,a=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=r,this.filters=s,this.limit=o,this.startAt=a,this.endAt=c,this.Te=null;}};function tl(n,e=null,t=[],r=[],s=null,o=null,a=null){return new go(n,e,t,r,s,o,a);}function Ua(n){let e=q(n);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(r=>oo(r)).join(","),t+="|ob:",t+=e.orderBy.map(r=>function(o){return o.field.canonicalString()+o.dir;}(r)).join(","),Sr(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(r=>fn(r)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(r=>fn(r)).join(",")),e.Te=t;}return e.Te;}function Ka(n,e){if(n.limit!==e.limit||n.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<n.orderBy.length;t++)if(!Tm(n.orderBy[t],e.orderBy[t]))return!1;if(n.filters.length!==e.filters.length)return!1;for(let t=0;t<n.filters.length;t++)if(!nh(n.filters[t],e.filters[t]))return!1;return n.collectionGroup===e.collectionGroup&&!!n.path.isEqual(e.path)&&!!el(n.startAt,e.startAt)&&el(n.endAt,e.endAt);}function po(n){return j.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0;}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var pn=class{constructor(e,t=null,r=[],s=[],o=null,a="F",c=null,l=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=r,this.filters=s,this.limit=o,this.limitType=a,this.startAt=c,this.endAt=l,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt;}};function Sm(n,e,t,r,s,o,a,c){return new pn(n,e,t,r,s,o,a,c);}function Ks(n){return new pn(n);}function nl(n){return n.filters.length===0&&n.limit===null&&n.startAt==null&&n.endAt==null&&(n.explicitOrderBy.length===0||n.explicitOrderBy.length===1&&n.explicitOrderBy[0].field.isKeyField());}function Am(n){return n.collectionGroup!==null;}function or(n){let e=q(n);if(e.Ie===null){e.Ie=[];let t=new Set();for(let o of e.explicitOrderBy)e.Ie.push(o),t.add(o.field.canonicalString());let r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(a){let c=new ye(Ne.comparator);return a.filters.forEach(l=>{l.getFlattenedFilters().forEach(h=>{h.isInequality()&&(c=c.add(h.field));});}),c;})(e).forEach(o=>{t.has(o.canonicalString())||o.isKeyField()||e.Ie.push(new gn(o,r));}),t.has(Ne.keyField().canonicalString())||e.Ie.push(new gn(Ne.keyField(),r));}return e.Ie;}function He(n){let e=q(n);return e.Ee||(e.Ee=Cm(e,or(n))),e.Ee;}function Cm(n,e){if(n.limitType==="F")return tl(n.path,n.collectionGroup,e,n.filters,n.limit,n.startAt,n.endAt);{e=e.map(s=>{let o=s.dir==="desc"?"asc":"desc";return new gn(s.field,o);});let t=n.endAt?new mn(n.endAt.position,n.endAt.inclusive):null,r=n.startAt?new mn(n.startAt.position,n.startAt.inclusive):null;return tl(n.path,n.collectionGroup,e,n.filters,n.limit,t,r);}}function yo(n,e,t){return new pn(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),e,t,n.startAt,n.endAt);}function Gs(n,e){return Ka(He(n),He(e))&&n.limitType===e.limitType;}function ih(n){return"".concat(Ua(He(n)),"|lt:").concat(n.limitType);}function tn(n){return"Query(target=".concat(function(t){let r=t.path.canonicalString();return t.collectionGroup!==null&&(r+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(r+=", filters: [".concat(t.filters.map(s=>rh(s)).join(", "),"]")),Sr(t.limit)||(r+=", limit: "+t.limit),t.orderBy.length>0&&(r+=", orderBy: [".concat(t.orderBy.map(s=>function(a){return"".concat(a.field.canonicalString()," (").concat(a.dir,")");}(s)).join(", "),"]")),t.startAt&&(r+=", startAt: ",r+=t.startAt.inclusive?"b:":"a:",r+=t.startAt.position.map(s=>fn(s)).join(",")),t.endAt&&(r+=", endAt: ",r+=t.endAt.inclusive?"a:":"b:",r+=t.endAt.position.map(s=>fn(s)).join(",")),"Target(".concat(r,")");}(He(n)),"; limitType=").concat(n.limitType,")");}function zs(n,e){return e.isFoundDocument()&&function(r,s){let o=s.key.path;return r.collectionGroup!==null?s.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(o):j.isDocumentKey(r.path)?r.path.isEqual(o):r.path.isImmediateParentOf(o);}(n,e)&&function(r,s){for(let o of or(r))if(!o.field.isKeyField()&&s.data.field(o.field)===null)return!1;return!0;}(n,e)&&function(r,s){for(let o of r.filters)if(!o.matches(s))return!1;return!0;}(n,e)&&function(r,s){return!(r.startAt&&!function(a,c,l){let h=Zu(a,c,l);return a.inclusive?h<=0:h<0;}(r.startAt,or(r),s)||r.endAt&&!function(a,c,l){let h=Zu(a,c,l);return a.inclusive?h>=0:h>0;}(r.endAt,or(r),s));}(n,e);}function Rm(n){return n.collectionGroup||(n.path.length%2==1?n.path.lastSegment():n.path.get(n.path.length-2));}function oh(n){return(e,t)=>{let r=!1;for(let s of or(n)){let o=Pm(s,e,t);if(o!==0)return o;r=r||s.field.isKeyField();}return 0;};}function Pm(n,e,t){let r=n.field.isKeyField()?j.comparator(e.key,t.key):function(o,a,c){let l=a.data.field(o),h=c.data.field(o);return l!==null&&h!==null?dn(l,h):K(42886);}(n.field,e,t);switch(n.dir){case"asc":return r;case"desc":return-1*r;default:return K(19790,{direction:n.dir});}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var lt=class{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0;}get(e){let t=this.mapKeyFn(e),r=this.inner[t];if(r!==void 0){for(let[s,o]of r)if(this.equalsFn(s,e))return o;}}has(e){return this.get(e)!==void 0;}set(e,t){let r=this.mapKeyFn(e),s=this.inner[r];if(s===void 0)return this.inner[r]=[[e,t]],void this.innerSize++;for(let o=0;o<s.length;o++)if(this.equalsFn(s[o][0],e))return void(s[o]=[e,t]);s.push([e,t]),this.innerSize++;}delete(e){let t=this.mapKeyFn(e),r=this.inner[t];if(r===void 0)return!1;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],e))return r.length===1?delete this.inner[t]:r.splice(s,1),this.innerSize--,!0;return!1;}forEach(e){Ct(this.inner,(t,r)=>{for(let[s,o]of r)e(s,o);});}isEmpty(){return $l(this.inner);}size(){return this.innerSize;}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Dm=new ue(j.comparator);function ht(){return Dm;}var ah=new ue(j.comparator);function rr(...n){let e=ah;for(let t of n)e=e.insert(t.key,t);return e;}function ch(n){let e=ah;return n.forEach((t,r)=>e=e.insert(t,r.overlayedDocument)),e;}function Ot(){return ar();}function uh(){return ar();}function ar(){return new lt(n=>n.toString(),(n,e)=>n.isEqual(e));}var xm=new ue(j.comparator),Vm=new ye(j.comparator);function W(...n){let e=Vm;for(let t of n)e=e.add(t);return e;}var Nm=new ye(Q);function km(){return Nm;}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ga(n,e){if(n.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"};}return{doubleValue:dr(e)?"-0":e};}function lh(n){return{integerValue:""+n};}function Om(n,e){return um(e)?lh(e):Ga(n,e);}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var yn=class{constructor(){this._=void 0;}};function Lm(n,e,t){return n instanceof Ut?function(s,o){let a={fields:{[Hl]:{stringValue:ql},[Wl]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return o&&La(o)&&(o=Us(o)),o&&(a.fields[Ql]=o),{mapValue:a};}(t,e):n instanceof Kt?dh(n,e):n instanceof Gt?fh(n,e):function(s,o){let a=hh(s,o),c=rl(a)+rl(s.Ae);return io(a)&&io(s.Ae)?lh(c):Ga(s.serializer,c);}(n,e);}function Mm(n,e,t){return n instanceof Kt?dh(n,e):n instanceof Gt?fh(n,e):t;}function hh(n,e){return n instanceof wn?function(r){return io(r)||function(o){return!!o&&"doubleValue"in o;}(r);}(e)?e:{integerValue:0}:null;}var Ut=class extends yn{},Kt=class extends yn{constructor(e){super(),this.elements=e;}};function dh(n,e){let t=mh(e);for(let r of n.elements)t.some(s=>Qe(s,r))||t.push(r);return{arrayValue:{values:t}};}var Gt=class extends yn{constructor(e){super(),this.elements=e;}};function fh(n,e){let t=mh(e);for(let r of n.elements)t=t.filter(s=>!Qe(s,r));return{arrayValue:{values:t}};}var wn=class extends yn{constructor(e,t){super(),this.serializer=e,this.Ae=t;}};function rl(n){return oe(n.integerValue||n.doubleValue);}function mh(n){return Ba(n)&&n.arrayValue.values?n.arrayValue.values.slice():[];}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var wo=class{constructor(e,t){this.field=e,this.transform=t;}};function Fm(n,e){return n.field.isEqual(e.field)&&function(r,s){return r instanceof Kt&&s instanceof Kt||r instanceof Gt&&s instanceof Gt?un(r.elements,s.elements,Qe):r instanceof wn&&s instanceof wn?Qe(r.Ae,s.Ae):r instanceof Ut&&s instanceof Ut;}(n.transform,e.transform);}var _o=class{constructor(e,t){this.version=e,this.transformResults=t;}},Ve=class n{constructor(e,t){this.updateTime=e,this.exists=t;}static none(){return new n();}static exists(e){return new n(void 0,e);}static updateTime(e){return new n(e);}get isNone(){return this.updateTime===void 0&&this.exists===void 0;}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime);}};function os(n,e){return n.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(n.updateTime):n.exists===void 0||n.exists===e.isFoundDocument();}var _n=class{};function gh(n,e){if(!n.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return n.isNoDocument()?new vn(n.key,Ve.none()):new zt(n.key,n.data,Ve.none());{let t=n.data,r=Re.empty(),s=new ye(Ne.comparator);for(let o of e.fields)if(!s.has(o)){let a=t.field(o);a===null&&o.length>1&&(o=o.popLast(),a=t.field(o)),a===null?r.delete(o):r.set(o,a),s=s.add(o);}return new Je(n.key,r,new Me(s.toArray()),Ve.none());}}function Bm(n,e,t){n instanceof zt?function(s,o,a){let c=s.value.clone(),l=il(s.fieldTransforms,o,a.transformResults);c.setAll(l),o.convertToFoundDocument(a.version,c).setHasCommittedMutations();}(n,e,t):n instanceof Je?function(s,o,a){if(!os(s.precondition,o))return void o.convertToUnknownDocument(a.version);let c=il(s.fieldTransforms,o,a.transformResults),l=o.data;l.setAll(ph(s)),l.setAll(c),o.convertToFoundDocument(a.version,l).setHasCommittedMutations();}(n,e,t):function(s,o,a){o.convertToNoDocument(a.version).setHasCommittedMutations();}(0,e,t);}function cr(n,e,t,r){return n instanceof zt?function(o,a,c,l){if(!os(o.precondition,a))return c;let h=o.value.clone(),f=ol(o.fieldTransforms,l,a);return h.setAll(f),a.convertToFoundDocument(a.version,h).setHasLocalMutations(),null;}(n,e,t,r):n instanceof Je?function(o,a,c,l){if(!os(o.precondition,a))return c;let h=ol(o.fieldTransforms,l,a),f=a.data;return f.setAll(ph(o)),f.setAll(h),a.convertToFoundDocument(a.version,f).setHasLocalMutations(),c===null?null:c.unionWith(o.fieldMask.fields).unionWith(o.fieldTransforms.map(p=>p.field));}(n,e,t,r):function(o,a,c){return os(o.precondition,a)?(a.convertToNoDocument(a.version).setHasLocalMutations(),null):c;}(n,e,t);}function Um(n,e){let t=null;for(let r of n.fieldTransforms){let s=e.data.field(r.field),o=hh(r.transform,s||null);o!=null&&(t===null&&(t=Re.empty()),t.set(r.field,o));}return t||null;}function sl(n,e){return n.type===e.type&&!!n.key.isEqual(e.key)&&!!n.precondition.isEqual(e.precondition)&&!!function(r,s){return r===void 0&&s===void 0||!(!r||!s)&&un(r,s,(o,a)=>Fm(o,a));}(n.fieldTransforms,e.fieldTransforms)&&(n.type===0?n.value.isEqual(e.value):n.type!==1||n.data.isEqual(e.data)&&n.fieldMask.isEqual(e.fieldMask));}var zt=class extends _n{constructor(e,t,r,s=[]){super(),this.key=e,this.value=t,this.precondition=r,this.fieldTransforms=s,this.type=0;}getFieldMask(){return null;}},Je=class extends _n{constructor(e,t,r,s,o=[]){super(),this.key=e,this.data=t,this.fieldMask=r,this.precondition=s,this.fieldTransforms=o,this.type=1;}getFieldMask(){return this.fieldMask;}};function ph(n){let e=new Map();return n.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){let r=n.data.field(t);e.set(t,r);}}),e;}function il(n,e,t){let r=new Map();ee(n.length===t.length,32656,{Re:t.length,Ve:n.length});for(let s=0;s<t.length;s++){let o=n[s],a=o.transform,c=e.data.field(o.field);r.set(o.field,Mm(a,c,t[s]));}return r;}function ol(n,e,t){let r=new Map();for(let s of n){let o=s.transform,a=t.data.field(s.field);r.set(s.field,Lm(o,a,e));}return r;}var vn=class extends _n{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[];}getFieldMask(){return null;}},gs=class extends _n{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[];}getFieldMask(){return null;}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var vo=class{constructor(e,t,r,s){this.batchId=e,this.localWriteTime=t,this.baseMutations=r,this.mutations=s;}applyToRemoteDocument(e,t){let r=t.mutationResults;for(let s=0;s<this.mutations.length;s++){let o=this.mutations[s];o.key.isEqual(e.key)&&Bm(o,e,r[s]);}}applyToLocalView(e,t){for(let r of this.baseMutations)r.key.isEqual(e.key)&&(t=cr(r,e,t,this.localWriteTime));for(let r of this.mutations)r.key.isEqual(e.key)&&(t=cr(r,e,t,this.localWriteTime));return t;}applyToLocalDocumentSet(e,t){let r=uh();return this.mutations.forEach(s=>{let o=e.get(s.key),a=o.overlayedDocument,c=this.applyToLocalView(a,o.mutatedFields);c=t.has(s.key)?null:c;let l=gh(a,c);l!==null&&r.set(s.key,l),a.isValidDocument()||a.convertToNoDocument($.min());}),r;}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),W());}isEqual(e){return this.batchId===e.batchId&&un(this.mutations,e.mutations,(t,r)=>sl(t,r))&&un(this.baseMutations,e.baseMutations,(t,r)=>sl(t,r));}},Eo=class n{constructor(e,t,r,s){this.batch=e,this.commitVersion=t,this.mutationResults=r,this.docVersions=s;}static from(e,t,r){ee(e.mutations.length===r.length,58842,{me:e.mutations.length,fe:r.length});let s=function(){return xm;}(),o=e.mutations;for(let a=0;a<o.length;a++)s=s.insert(o[a].key,r[a].version);return new n(e,t,r,s);}};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var bo=class{constructor(e,t){this.largestBatchId=e,this.mutation=t;}getKey(){return this.mutation.key;}isEqual(e){return e!==null&&this.mutation===e.mutation;}toString(){return"Overlay{\n      largestBatchId: ".concat(this.largestBatchId,",\n      mutation: ").concat(this.mutation.toString(),"\n    }");}};/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var To=class{constructor(e,t){this.count=e,this.unchangedNames=t;}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var le,Z;function yh(n){switch(n){case x.OK:return K(64938);case x.CANCELLED:case x.UNKNOWN:case x.DEADLINE_EXCEEDED:case x.RESOURCE_EXHAUSTED:case x.INTERNAL:case x.UNAVAILABLE:case x.UNAUTHENTICATED:return!1;case x.INVALID_ARGUMENT:case x.NOT_FOUND:case x.ALREADY_EXISTS:case x.PERMISSION_DENIED:case x.FAILED_PRECONDITION:case x.ABORTED:case x.OUT_OF_RANGE:case x.UNIMPLEMENTED:case x.DATA_LOSS:return!0;default:return K(15467,{code:n});}}function wh(n){if(n===void 0)return at("GRPC error has no .code"),x.UNKNOWN;switch(n){case le.OK:return x.OK;case le.CANCELLED:return x.CANCELLED;case le.UNKNOWN:return x.UNKNOWN;case le.DEADLINE_EXCEEDED:return x.DEADLINE_EXCEEDED;case le.RESOURCE_EXHAUSTED:return x.RESOURCE_EXHAUSTED;case le.INTERNAL:return x.INTERNAL;case le.UNAVAILABLE:return x.UNAVAILABLE;case le.UNAUTHENTICATED:return x.UNAUTHENTICATED;case le.INVALID_ARGUMENT:return x.INVALID_ARGUMENT;case le.NOT_FOUND:return x.NOT_FOUND;case le.ALREADY_EXISTS:return x.ALREADY_EXISTS;case le.PERMISSION_DENIED:return x.PERMISSION_DENIED;case le.FAILED_PRECONDITION:return x.FAILED_PRECONDITION;case le.ABORTED:return x.ABORTED;case le.OUT_OF_RANGE:return x.OUT_OF_RANGE;case le.UNIMPLEMENTED:return x.UNIMPLEMENTED;case le.DATA_LOSS:return x.DATA_LOSS;default:return K(39323,{code:n});}}(Z=le||(le={}))[Z.OK=0]="OK",Z[Z.CANCELLED=1]="CANCELLED",Z[Z.UNKNOWN=2]="UNKNOWN",Z[Z.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",Z[Z.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",Z[Z.NOT_FOUND=5]="NOT_FOUND",Z[Z.ALREADY_EXISTS=6]="ALREADY_EXISTS",Z[Z.PERMISSION_DENIED=7]="PERMISSION_DENIED",Z[Z.UNAUTHENTICATED=16]="UNAUTHENTICATED",Z[Z.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",Z[Z.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",Z[Z.ABORTED=10]="ABORTED",Z[Z.OUT_OF_RANGE=11]="OUT_OF_RANGE",Z[Z.UNIMPLEMENTED=12]="UNIMPLEMENTED",Z[Z.INTERNAL=13]="INTERNAL",Z[Z.UNAVAILABLE=14]="UNAVAILABLE",Z[Z.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Km=null;/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gm(){return new TextEncoder();}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var zm=new st([4294967295,4294967295],0);function al(n){let e=Gm().encode(n),t=new Fi();return t.update(e),new Uint8Array(t.digest());}function cl(n){let e=new DataView(n.buffer),t=e.getUint32(0,!0),r=e.getUint32(4,!0),s=e.getUint32(8,!0),o=e.getUint32(12,!0);return[new st([t,r],0),new st([s,o],0)];}var Io=class n{constructor(e,t,r){if(this.bitmap=e,this.padding=t,this.hashCount=r,t<0||t>=8)throw new Lt("Invalid padding: ".concat(t));if(r<0)throw new Lt("Invalid hash count: ".concat(r));if(e.length>0&&this.hashCount===0)throw new Lt("Invalid hash count: ".concat(r));if(e.length===0&&t!==0)throw new Lt("Invalid padding when bitmap length is 0: ".concat(t));this.ge=8*e.length-t,this.pe=st.fromNumber(this.ge);}ye(e,t,r){let s=e.add(t.multiply(st.fromNumber(r)));return s.compare(zm)===1&&(s=new st([s.getBits(0),s.getBits(1)],0)),s.modulo(this.pe).toNumber();}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8);}mightContain(e){if(this.ge===0)return!1;let t=al(e),[r,s]=cl(t);for(let o=0;o<this.hashCount;o++){let a=this.ye(r,s,o);if(!this.we(a))return!1;}return!0;}static create(e,t,r){let s=e%8==0?0:8-e%8,o=new Uint8Array(Math.ceil(e/8)),a=new n(o,s,t);return r.forEach(c=>a.insert(c)),a;}insert(e){if(this.ge===0)return;let t=al(e),[r,s]=cl(t);for(let o=0;o<this.hashCount;o++){let a=this.ye(r,s,o);this.Se(a);}}Se(e){let t=Math.floor(e/8),r=e%8;this.bitmap[t]|=1<<r;}},Lt=class extends Error{constructor(){super(...arguments),this.name="BloomFilterError";}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ps=class n{constructor(e,t,r,s,o){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=r,this.documentUpdates=s,this.resolvedLimboDocuments=o;}static createSynthesizedRemoteEventForCurrentChange(e,t,r){let s=new Map();return s.set(e,gr.createSynthesizedTargetChangeForCurrentChange(e,t,r)),new n($.min(),s,new ue(Q),ht(),W());}},gr=class n{constructor(e,t,r,s,o){this.resumeToken=e,this.current=t,this.addedDocuments=r,this.modifiedDocuments=s,this.removedDocuments=o;}static createSynthesizedTargetChangeForCurrentChange(e,t,r){return new n(r,t,W(),W(),W());}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var on=class{constructor(e,t,r,s){this.be=e,this.removedTargetIds=t,this.key=r,this.De=s;}},ys=class{constructor(e,t){this.targetId=e,this.Ce=t;}},ws=class{constructor(e,t,r=Se.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=t,this.resumeToken=r,this.cause=s;}},_s=class{constructor(){this.ve=0,this.Fe=ul(),this.Me=Se.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0;}get current(){return this.xe;}get resumeToken(){return this.Me;}get Ne(){return this.ve!==0;}get Be(){return this.Oe;}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e);}ke(){let e=W(),t=W(),r=W();return this.Fe.forEach((s,o)=>{switch(o){case 0:e=e.add(s);break;case 2:t=t.add(s);break;case 1:r=r.add(s);break;default:K(38017,{changeType:o});}}),new gr(this.Me,this.xe,e,t,r);}qe(){this.Oe=!1,this.Fe=ul();}Qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t);}$e(e){this.Oe=!0,this.Fe=this.Fe.remove(e);}Ue(){this.ve+=1;}Ke(){this.ve-=1,ee(this.ve>=0,3241,{ve:this.ve});}We(){this.Oe=!0,this.xe=!0;}},So=class{constructor(e){this.Ge=e,this.ze=new Map(),this.je=ht(),this.Je=ns(),this.He=ns(),this.Ye=new ue(Q);}Ze(e){for(let t of e.be)e.De&&e.De.isFoundDocument()?this.Xe(t,e.De):this.et(t,e.key,e.De);for(let t of e.removedTargetIds)this.et(t,e.key,e.De);}tt(e){this.forEachTarget(e,t=>{let r=this.nt(t);switch(e.state){case 0:this.rt(t)&&r.Le(e.resumeToken);break;case 1:r.Ke(),r.Ne||r.qe(),r.Le(e.resumeToken);break;case 2:r.Ke(),r.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(r.We(),r.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),r.Le(e.resumeToken));break;default:K(56790,{state:e.state});}});}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((r,s)=>{this.rt(s)&&t(s);});}st(e){let t=e.targetId,r=e.Ce.count,s=this.ot(t);if(s){let o=s.target;if(po(o)){if(r===0){let a=new j(o.path);this.et(t,a,Oe.newNoDocument(a,$.min()));}else ee(r===1,20013,{expectedCount:r});}else{let a=this._t(t);if(a!==r){let c=this.ut(e),l=c?this.ct(c,e,a):1;if(l!==0){this.it(t);let h=l===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ye=this.Ye.insert(t,h);}Km===null||Km===void 0||Km.lt(function(f,p,g,T,C,_R$hashCount,_R$bits$bitmap$length,_R$bits,_R$bits$padding,_R$bits2){let A={localCacheCount:f,existenceFilterCount:p.count,databaseId:g.database,projectId:g.projectId},R=p.unchangedNames;return R&&(A.bloomFilter={applied:C===0,hashCount:(_R$hashCount=R===null||R===void 0?void 0:R.hashCount)!==null&&_R$hashCount!==void 0?_R$hashCount:0,bitmapLength:(_R$bits$bitmap$length=R===null||R===void 0||(_R$bits=R.bits)===null||_R$bits===void 0||(_R$bits=_R$bits.bitmap)===null||_R$bits===void 0?void 0:_R$bits.length)!==null&&_R$bits$bitmap$length!==void 0?_R$bits$bitmap$length:0,padding:(_R$bits$padding=R===null||R===void 0||(_R$bits2=R.bits)===null||_R$bits2===void 0?void 0:_R$bits2.padding)!==null&&_R$bits$padding!==void 0?_R$bits$padding:0,mightContain:V=>{var _T$mightContain;return(_T$mightContain=T===null||T===void 0?void 0:T.mightContain(V))!==null&&_T$mightContain!==void 0?_T$mightContain:!1;}}),A;}(a,e.Ce,this.Ge.ht(),c,l));}}}}ut(e){let t=e.Ce.unchangedNames;if(!t||!t.bits)return null;let{bits:{bitmap:r="",padding:s=0},hashCount:o=0}=t,a,c;try{a=ut(r).toUint8Array();}catch(l){if(l instanceof hs)return cn("Decoding the base64 bloom filter in existence filter failed ("+l.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw l;}try{c=new Io(a,s,o);}catch(l){return cn(l instanceof Lt?"BloomFilter error: ":"Applying bloom filter failed: ",l),null;}return c.ge===0?null:c;}ct(e,t,r){return t.Ce.count===r-this.Pt(e,t.targetId)?0:2;}Pt(e,t){let r=this.Ge.getRemoteKeysForTarget(t),s=0;return r.forEach(o=>{let a=this.Ge.ht(),c="projects/".concat(a.projectId,"/databases/").concat(a.database,"/documents/").concat(o.path.canonicalString());e.mightContain(c)||(this.et(t,o,null),s++);}),s;}Tt(e){let t=new Map();this.ze.forEach((o,a)=>{let c=this.ot(a);if(c){if(o.current&&po(c.target)){let l=new j(c.target.path);this.It(l).has(a)||this.Et(a,l)||this.et(a,l,Oe.newNoDocument(l,e));}o.Be&&(t.set(a,o.ke()),o.qe());}});let r=W();this.He.forEach((o,a)=>{let c=!0;a.forEachWhile(l=>{let h=this.ot(l);return!h||h.purpose==="TargetPurposeLimboResolution"||(c=!1,!1);}),c&&(r=r.add(o));}),this.je.forEach((o,a)=>a.setReadTime(e));let s=new ps(e,t,this.Ye,this.je,r);return this.je=ht(),this.Je=ns(),this.He=ns(),this.Ye=new ue(Q),s;}Xe(e,t){if(!this.rt(e))return;let r=this.Et(e,t.key)?2:0;this.nt(e).Qe(t.key,r),this.je=this.je.insert(t.key,t),this.Je=this.Je.insert(t.key,this.It(t.key).add(e)),this.He=this.He.insert(t.key,this.dt(t.key).add(e));}et(e,t,r){if(!this.rt(e))return;let s=this.nt(e);this.Et(e,t)?s.Qe(t,1):s.$e(t),this.He=this.He.insert(t,this.dt(t).delete(e)),this.He=this.He.insert(t,this.dt(t).add(e)),r&&(this.je=this.je.insert(t,r));}removeTarget(e){this.ze.delete(e);}_t(e){let t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size;}Ue(e){this.nt(e).Ue();}nt(e){let t=this.ze.get(e);return t||(t=new _s(),this.ze.set(e,t)),t;}dt(e){let t=this.He.get(e);return t||(t=new ye(Q),this.He=this.He.insert(e,t)),t;}It(e){let t=this.Je.get(e);return t||(t=new ye(Q),this.Je=this.Je.insert(e,t)),t;}rt(e){let t=this.ot(e)!==null;return t||U("WatchChangeAggregator","Detected inactive target",e),t;}ot(e){let t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e);}it(e){this.ze.set(e,new _s()),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null);});}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t);}};function ns(){return new ue(j.comparator);}function ul(){return new ue(j.comparator);}var jm={asc:"ASCENDING",desc:"DESCENDING"},$m={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},qm={and:"AND",or:"OR"},Ao=class{constructor(e,t){this.databaseId=e,this.useProto3Json=t;}};function Co(n,e){return n.useProto3Json||Sr(e)?e:{value:e};}function vs(n,e){return n.useProto3Json?"".concat(new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z",""),".").concat(("000000000"+e.nanoseconds).slice(-9),"Z"):{seconds:""+e.seconds,nanos:e.nanoseconds};}function _h(n,e){return n.useProto3Json?e.toBase64():e.toUint8Array();}function Hm(n,e){return vs(n,e.toTimestamp());}function ke(n){return ee(!!n,49232),$.fromTimestamp(function(t){let r=ct(t);return new fe(r.seconds,r.nanos);}(n));}function za(n,e){return Ro(n,e).canonicalString();}function Ro(n,e){let t=function(s){return new ie(["projects",s.projectId,"databases",s.database]);}(n).child("documents");return e===void 0?t:t.child(e);}function vh(n){let e=ie.fromString(n);return ee(Ah(e),10190,{key:e.toString()}),e;}function Es(n,e){return za(n.databaseId,e.path);}function ur(n,e){let t=vh(e);if(t.get(1)!==n.databaseId.projectId)throw new B(x.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+n.databaseId.projectId);if(t.get(3)!==n.databaseId.database)throw new B(x.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+n.databaseId.database);return new j(bh(t));}function Eh(n,e){return za(n.databaseId,e);}function Qm(n){let e=vh(n);return e.length===4?ie.emptyPath():bh(e);}function Po(n){return new ie(["projects",n.databaseId.projectId,"databases",n.databaseId.database]).canonicalString();}function bh(n){return ee(n.length>4&&n.get(4)==="documents",29091,{key:n.toString()}),n.popFirst(5);}function ll(n,e,t){return{name:Es(n,e),fields:t.value.mapValue.fields};}function Wm(n,e){return"found"in e?function(r,s){ee(!!s.found,43571),s.found.name,s.found.updateTime;let o=ur(r,s.found.name),a=ke(s.found.updateTime),c=s.found.createTime?ke(s.found.createTime):$.min(),l=new Re({mapValue:{fields:s.found.fields}});return Oe.newFoundDocument(o,a,c,l);}(n,e):"missing"in e?function(r,s){ee(!!s.missing,3894),ee(!!s.readTime,22933);let o=ur(r,s.missing),a=ke(s.readTime);return Oe.newNoDocument(o,a);}(n,e):K(7234,{result:e});}function Jm(n,e){let t;if("targetChange"in e){e.targetChange;let r=function(h){return h==="NO_CHANGE"?0:h==="ADD"?1:h==="REMOVE"?2:h==="CURRENT"?3:h==="RESET"?4:K(39313,{state:h});}(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],o=function(h,f){return h.useProto3Json?(ee(f===void 0||typeof f=="string",58123),Se.fromBase64String(f||"")):(ee(f===void 0||f instanceof Buffer||f instanceof Uint8Array,16193),Se.fromUint8Array(f||new Uint8Array()));}(n,e.targetChange.resumeToken),a=e.targetChange.cause,c=a&&function(h){let f=h.code===void 0?x.UNKNOWN:wh(h.code);return new B(f,h.message||"");}(a);t=new ws(r,s,o,c||null);}else if("documentChange"in e){e.documentChange;let r=e.documentChange;r.document,r.document.name,r.document.updateTime;let s=ur(n,r.document.name),o=ke(r.document.updateTime),a=r.document.createTime?ke(r.document.createTime):$.min(),c=new Re({mapValue:{fields:r.document.fields}}),l=Oe.newFoundDocument(s,o,a,c),h=r.targetIds||[],f=r.removedTargetIds||[];t=new on(h,f,l.key,l);}else if("documentDelete"in e){e.documentDelete;let r=e.documentDelete;r.document;let s=ur(n,r.document),o=r.readTime?ke(r.readTime):$.min(),a=Oe.newNoDocument(s,o),c=r.removedTargetIds||[];t=new on([],c,a.key,a);}else if("documentRemove"in e){e.documentRemove;let r=e.documentRemove;r.document;let s=ur(n,r.document),o=r.removedTargetIds||[];t=new on([],o,s,null);}else{if(!("filter"in e))return K(11601,{Rt:e});{e.filter;let r=e.filter;r.targetId;let{count:s=0,unchangedNames:o}=r,a=new To(s,o),c=r.targetId;t=new ys(c,a);}}return t;}function Th(n,e){let t;if(e instanceof zt)t={update:ll(n,e.key,e.value)};else if(e instanceof vn)t={delete:Es(n,e.key)};else if(e instanceof Je)t={update:ll(n,e.key,e.data),updateMask:ig(e.fieldMask)};else{if(!(e instanceof gs))return K(16599,{Vt:e.type});t={verify:Es(n,e.key)};}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(r=>function(o,a){let c=a.transform;if(c instanceof Ut)return{fieldPath:a.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof Kt)return{fieldPath:a.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof Gt)return{fieldPath:a.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof wn)return{fieldPath:a.field.canonicalString(),increment:c.Ae};throw K(20930,{transform:a.transform});}(0,r))),e.precondition.isNone||(t.currentDocument=function(s,o){return o.updateTime!==void 0?{updateTime:Hm(s,o.updateTime)}:o.exists!==void 0?{exists:o.exists}:K(27497);}(n,e.precondition)),t;}function Xm(n,e){return n&&n.length>0?(ee(e!==void 0,14353),n.map(t=>function(s,o){let a=s.updateTime?ke(s.updateTime):ke(o);return a.isEqual($.min())&&(a=ke(o)),new _o(a,s.transformResults||[]);}(t,e))):[];}function Ym(n,e){return{documents:[Eh(n,e.path)]};}function Zm(n,e){let t={structuredQuery:{}},r=e.path,s;e.collectionGroup!==null?(s=r,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=r.popLast(),t.structuredQuery.from=[{collectionId:r.lastSegment()}]),t.parent=Eh(n,s);let o=function(h){if(h.length!==0)return Sh(We.create(h,"and"));}(e.filters);o&&(t.structuredQuery.where=o);let a=function(h){if(h.length!==0)return h.map(f=>function(g){return{field:nn(g.field),direction:ng(g.dir)};}(f));}(e.orderBy);a&&(t.structuredQuery.orderBy=a);let c=Co(n,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=function(h){return{before:h.inclusive,values:h.position};}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(h){return{before:!h.inclusive,values:h.position};}(e.endAt)),{ft:t,parent:s};}function eg(n){let e=Qm(n.parent),t=n.structuredQuery,r=t.from?t.from.length:0,s=null;if(r>0){ee(r===1,65062);let f=t.from[0];f.allDescendants?s=f.collectionId:e=e.child(f.collectionId);}let o=[];t.where&&(o=function(p){let g=Ih(p);return g instanceof We&&th(g)?g.getFilters():[g];}(t.where));let a=[];t.orderBy&&(a=function(p){return p.map(g=>function(C){return new gn(rn(C.field),function(R){switch(R){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return;}}(C.direction));}(g));}(t.orderBy));let c=null;t.limit&&(c=function(p){let g;return g=typeof p=="object"?p.value:p,Sr(g)?null:g;}(t.limit));let l=null;t.startAt&&(l=function(p){let g=!!p.before,T=p.values||[];return new mn(T,g);}(t.startAt));let h=null;return t.endAt&&(h=function(p){let g=!p.before,T=p.values||[];return new mn(T,g);}(t.endAt)),Sm(e,s,a,o,c,"F",l,h);}function tg(n,e){let t=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return K(28987,{purpose:s});}}(e.purpose);return t==null?null:{"goog-listen-tags":t};}function Ih(n){return n.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":let r=rn(t.unaryFilter.field);return me.create(r,"==",{doubleValue:NaN});case"IS_NULL":let s=rn(t.unaryFilter.field);return me.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":let o=rn(t.unaryFilter.field);return me.create(o,"!=",{doubleValue:NaN});case"IS_NOT_NULL":let a=rn(t.unaryFilter.field);return me.create(a,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return K(61313);default:return K(60726);}}(n):n.fieldFilter!==void 0?function(t){return me.create(rn(t.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return K(58110);default:return K(50506);}}(t.fieldFilter.op),t.fieldFilter.value);}(n):n.compositeFilter!==void 0?function(t){return We.create(t.compositeFilter.filters.map(r=>Ih(r)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return K(1026);}}(t.compositeFilter.op));}(n):K(30097,{filter:n});}function ng(n){return jm[n];}function rg(n){return $m[n];}function sg(n){return qm[n];}function nn(n){return{fieldPath:n.canonicalString()};}function rn(n){return Ne.fromServerFormat(n.fieldPath);}function Sh(n){return n instanceof me?function(t){if(t.op==="=="){if(Yu(t.value))return{unaryFilter:{field:nn(t.field),op:"IS_NAN"}};if(Xu(t.value))return{unaryFilter:{field:nn(t.field),op:"IS_NULL"}};}else if(t.op==="!="){if(Yu(t.value))return{unaryFilter:{field:nn(t.field),op:"IS_NOT_NAN"}};if(Xu(t.value))return{unaryFilter:{field:nn(t.field),op:"IS_NOT_NULL"}};}return{fieldFilter:{field:nn(t.field),op:rg(t.op),value:t.value}};}(n):n instanceof We?function(t){let r=t.getFilters().map(s=>Sh(s));return r.length===1?r[0]:{compositeFilter:{op:sg(t.op),filters:r}};}(n):K(54877,{filter:n});}function ig(n){let e=[];return n.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e};}function Ah(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases";}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var pr=class n{constructor(e,t,r,s,o=$.min(),a=$.min(),c=Se.EMPTY_BYTE_STRING,l=null){this.target=e,this.targetId=t,this.purpose=r,this.sequenceNumber=s,this.snapshotVersion=o,this.lastLimboFreeSnapshotVersion=a,this.resumeToken=c,this.expectedCount=l;}withSequenceNumber(e){return new n(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount);}withResumeToken(e,t){return new n(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null);}withExpectedCount(e){return new n(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e);}withLastLimboFreeSnapshotVersion(e){return new n(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount);}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Do=class{constructor(e){this.yt=e;}};function og(n){let e=eg({parent:n.parent,structuredQuery:n.structuredQuery});return n.limitType==="LAST"?yo(e,e.limit,"L"):e;}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var bs=class{constructor(){}Dt(e,t){this.Ct(e,t),t.vt();}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(oe(e.integerValue));else if("doubleValue"in e){let r=oe(e.doubleValue);isNaN(r)?this.Ft(t,13):(this.Ft(t,15),dr(r)?t.Mt(0):t.Mt(r));}else if("timestampValue"in e){let r=e.timestampValue;this.Ft(t,20),typeof r=="string"&&(r=ct(r)),t.xt("".concat(r.seconds||"")),t.Mt(r.nanos||0);}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(ut(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){let r=e.geoPointValue;this.Ft(t,45),t.Mt(r.latitude||0),t.Mt(r.longitude||0);}else"mapValue"in e?Yl(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):Xl(e)?this.kt(e.mapValue,t):(this.qt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.Qt(e.arrayValue,t),this.Nt(t)):K(19022,{$t:e});}Ot(e,t){this.Ft(t,25),this.Ut(e,t);}Ut(e,t){t.xt(e);}qt(e,t){let r=e.fields||{};this.Ft(t,55);for(let s of Object.keys(r))this.Ot(s,t),this.Ct(r[s],t);}kt(e,t){var _r$s$arrayValue;let r=e.fields||{};this.Ft(t,53);let s=hn,o=((_r$s$arrayValue=r[s].arrayValue)===null||_r$s$arrayValue===void 0||(_r$s$arrayValue=_r$s$arrayValue.values)===null||_r$s$arrayValue===void 0?void 0:_r$s$arrayValue.length)||0;this.Ft(t,15),t.Mt(oe(o)),this.Ot(s,t),this.Ct(r[s],t);}Qt(e,t){let r=e.values||[];this.Ft(t,50);for(let s of r)this.Ct(s,t);}Lt(e,t){this.Ft(t,37),j.fromName(e).path.forEach(r=>{this.Ft(t,60),this.Ut(r,t);});}Ft(e,t){e.Mt(t);}Nt(e){e.Mt(2);}};bs.Kt=new bs();/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var xo=class{constructor(){this.Cn=new Vo();}addToCollectionParentIndex(e,t){return this.Cn.add(t),N.resolve();}getCollectionParents(e,t){return N.resolve(this.Cn.getEntries(t));}addFieldIndex(e,t){return N.resolve();}deleteFieldIndex(e,t){return N.resolve();}deleteAllFieldIndexes(e){return N.resolve();}createTargetIndexes(e,t){return N.resolve();}getDocumentsMatchingTarget(e,t){return N.resolve(null);}getIndexType(e,t){return N.resolve(0);}getFieldIndexes(e,t){return N.resolve([]);}getNextCollectionGroupToUpdate(e){return N.resolve(null);}getMinOffset(e,t){return N.resolve(Bt.min());}getMinOffsetFromCollectionGroup(e,t){return N.resolve(Bt.min());}updateCollectionGroup(e,t,r){return N.resolve();}updateIndexEntries(e,t){return N.resolve();}},Vo=class{constructor(){this.index={};}add(e){let t=e.lastSegment(),r=e.popLast(),s=this.index[t]||new ye(ie.comparator),o=!s.has(r);return this.index[t]=s.add(r),o;}has(e){let t=e.lastSegment(),r=e.popLast(),s=this.index[t];return s&&s.has(r);}getEntries(e){return(this.index[e]||new ye(ie.comparator)).toArray();}};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var $p=new Uint8Array(0);/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var hl={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},Ch=41943040,Le=class n{static withCacheSize(e){return new n(e,n.DEFAULT_COLLECTION_PERCENTILE,n.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT);}constructor(e,t,r){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=r;}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Le.DEFAULT_COLLECTION_PERCENTILE=10,Le.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Le.DEFAULT=new Le(Ch,Le.DEFAULT_COLLECTION_PERCENTILE,Le.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Le.DISABLED=new Le(-1,0,0);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var yr=class n{constructor(e){this.ar=e;}next(){return this.ar+=2,this.ar;}static ur(){return new n(0);}static cr(){return new n(-1);}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var dl="LruGarbageCollector",ag=1048576;function fl([n,e],[t,r]){let s=Q(n,t);return s===0?Q(e,r):s;}var No=class{constructor(e){this.Ir=e,this.buffer=new ye(fl),this.Er=0;}dr(){return++this.Er;}Ar(e){let t=[e,this.dr()];if(this.buffer.size<this.Ir)this.buffer=this.buffer.add(t);else{let r=this.buffer.last();fl(t,r)<0&&(this.buffer=this.buffer.delete(r).add(t));}}get maxValue(){return this.buffer.last()[0];}},ko=class{constructor(e,t,r){this.garbageCollector=e,this.asyncQueue=t,this.localStore=r,this.Rr=null;}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Vr(6e4);}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null);}get started(){return this.Rr!==null;}Vr(e){U(dl,"Garbage collection scheduled in ".concat(e,"ms")),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector);}catch(t){Dn(t)?U(dl,"Ignoring IndexedDB error during garbage collection: ",t):await Pn(t);}await this.Vr(3e5);});}},Oo=class{constructor(e,t){this.mr=e,this.params=t;}calculateTargetCount(e,t){return this.mr.gr(e).next(r=>Math.floor(t/100*r));}nthSequenceNumber(e,t){if(t===0)return N.resolve(ln.ce);let r=new No(t);return this.mr.forEachTarget(e,s=>r.Ar(s.sequenceNumber)).next(()=>this.mr.pr(e,s=>r.Ar(s))).next(()=>r.maxValue);}removeTargets(e,t,r){return this.mr.removeTargets(e,t,r);}removeOrphanedDocuments(e,t){return this.mr.removeOrphanedDocuments(e,t);}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(U("LruGarbageCollector","Garbage collection skipped; disabled"),N.resolve(hl)):this.getCacheSize(e).next(r=>r<this.params.cacheSizeCollectionThreshold?(U("LruGarbageCollector","Garbage collection skipped; Cache size ".concat(r," is lower than threshold ").concat(this.params.cacheSizeCollectionThreshold)),hl):this.yr(e,t));}getCacheSize(e){return this.mr.getCacheSize(e);}yr(e,t){let r,s,o,a,c,l,h,f=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(U("LruGarbageCollector","Capping sequence numbers to collect down to the maximum of ".concat(this.params.maximumSequenceNumbersToCollect," from ").concat(p)),s=this.params.maximumSequenceNumbersToCollect):s=p,a=Date.now(),this.nthSequenceNumber(e,s))).next(p=>(r=p,c=Date.now(),this.removeTargets(e,r,t))).next(p=>(o=p,l=Date.now(),this.removeOrphanedDocuments(e,r))).next(p=>(h=Date.now(),en()<=X.DEBUG&&U("LruGarbageCollector","LRU Garbage Collection\n\tCounted targets in ".concat(a-f,"ms\n\tDetermined least recently used ").concat(s," in ")+(c-a)+"ms\n\tRemoved ".concat(o," targets in ")+(l-c)+"ms\n\tRemoved ".concat(p," documents in ")+(h-l)+"ms\nTotal Duration: ".concat(h-f,"ms")),N.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:o,documentsRemoved:p})));}};function cg(n,e){return new Oo(n,e);}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Lo=class{constructor(){this.changes=new lt(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1;}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e);}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,Oe.newInvalidDocument(e).setReadTime(t));}getEntry(e,t){this.assertNotApplied();let r=this.changes.get(t);return r!==void 0?N.resolve(r):this.getFromCache(e,t);}getEntries(e,t){return this.getAllFromCache(e,t);}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e);}assertNotApplied(){}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Mo=class{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t;}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Fo=class{constructor(e,t,r,s){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=r,this.indexManager=s;}getDocument(e,t){let r=null;return this.documentOverlayCache.getOverlay(e,t).next(s=>(r=s,this.remoteDocumentCache.getEntry(e,t))).next(s=>(r!==null&&cr(r.mutation,s,Me.empty(),fe.now()),s));}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(r=>this.getLocalViewOfDocuments(e,r,W()).next(()=>r));}getLocalViewOfDocuments(e,t,r=W()){let s=Ot();return this.populateOverlays(e,s,t).next(()=>this.computeViews(e,t,s,r).next(o=>{let a=rr();return o.forEach((c,l)=>{a=a.insert(c,l.overlayedDocument);}),a;}));}getOverlayedDocuments(e,t){let r=Ot();return this.populateOverlays(e,r,t).next(()=>this.computeViews(e,t,r,W()));}populateOverlays(e,t,r){let s=[];return r.forEach(o=>{t.has(o)||s.push(o);}),this.documentOverlayCache.getOverlays(e,s).next(o=>{o.forEach((a,c)=>{t.set(a,c);});});}computeViews(e,t,r,s){let o=ht(),a=ar(),c=function(){return ar();}();return t.forEach((l,h)=>{let f=r.get(h.key);s.has(h.key)&&(f===void 0||f.mutation instanceof Je)?o=o.insert(h.key,h):f!==void 0?(a.set(h.key,f.mutation.getFieldMask()),cr(f.mutation,h,f.mutation.getFieldMask(),fe.now())):a.set(h.key,Me.empty());}),this.recalculateAndSaveOverlays(e,o).next(l=>(l.forEach((h,f)=>a.set(h,f)),t.forEach((h,f)=>{var _a$get;return c.set(h,new Mo(f,(_a$get=a.get(h))!==null&&_a$get!==void 0?_a$get:null));}),c));}recalculateAndSaveOverlays(e,t){let r=ar(),s=new ue((a,c)=>a-c),o=W();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(a=>{for(let c of a)c.keys().forEach(l=>{let h=t.get(l);if(h===null)return;let f=r.get(l)||Me.empty();f=c.applyToLocalView(h,f),r.set(l,f);let p=(s.get(c.batchId)||W()).add(l);s=s.insert(c.batchId,p);});}).next(()=>{let a=[],c=s.getReverseIterator();for(;c.hasNext();){let l=c.getNext(),h=l.key,f=l.value,p=uh();f.forEach(g=>{if(!o.has(g)){let T=gh(t.get(g),r.get(g));T!==null&&p.set(g,T),o=o.add(g);}}),a.push(this.documentOverlayCache.saveOverlays(e,h,p));}return N.waitFor(a);}).next(()=>r);}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(r=>this.recalculateAndSaveOverlays(e,r));}getDocumentsMatchingQuery(e,t,r,s){return function(a){return j.isDocumentKey(a.path)&&a.collectionGroup===null&&a.filters.length===0;}(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):Am(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,r,s):this.getDocumentsMatchingCollectionQuery(e,t,r,s);}getNextDocuments(e,t,r,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,r,s).next(o=>{let a=s-o.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,r.largestBatchId,s-o.size):N.resolve(Ot()),c=hr,l=o;return a.next(h=>N.forEach(h,(f,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),o.get(f)?N.resolve():this.remoteDocumentCache.getEntry(e,f).next(g=>{l=l.insert(f,g);}))).next(()=>this.populateOverlays(e,h,o)).next(()=>this.computeViews(e,l,h,W())).next(f=>({batchId:c,changes:ch(f)})));});}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new j(t)).next(r=>{let s=rr();return r.isFoundDocument()&&(s=s.insert(r.key,r)),s;});}getDocumentsMatchingCollectionGroupQuery(e,t,r,s){let o=t.collectionGroup,a=rr();return this.indexManager.getCollectionParents(e,o).next(c=>N.forEach(c,l=>{let h=function(p,g){return new pn(g,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt);}(t,l.child(o));return this.getDocumentsMatchingCollectionQuery(e,h,r,s).next(f=>{f.forEach((p,g)=>{a=a.insert(p,g);});});}).next(()=>a));}getDocumentsMatchingCollectionQuery(e,t,r,s){let o;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,r.largestBatchId).next(a=>(o=a,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,r,o,s))).next(a=>{o.forEach((l,h)=>{let f=h.getKey();a.get(f)===null&&(a=a.insert(f,Oe.newInvalidDocument(f)));});let c=rr();return a.forEach((l,h)=>{let f=o.get(l);f!==void 0&&cr(f.mutation,h,Me.empty(),fe.now()),zs(t,h)&&(c=c.insert(l,h));}),c;});}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Bo=class{constructor(e){this.serializer=e,this.Lr=new Map(),this.kr=new Map();}getBundleMetadata(e,t){return N.resolve(this.Lr.get(t));}saveBundleMetadata(e,t){return this.Lr.set(t.id,function(s){return{id:s.id,version:s.version,createTime:ke(s.createTime)};}(t)),N.resolve();}getNamedQuery(e,t){return N.resolve(this.kr.get(t));}saveNamedQuery(e,t){return this.kr.set(t.name,function(s){return{name:s.name,query:og(s.bundledQuery),readTime:ke(s.readTime)};}(t)),N.resolve();}};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Uo=class{constructor(){this.overlays=new ue(j.comparator),this.qr=new Map();}getOverlay(e,t){return N.resolve(this.overlays.get(t));}getOverlays(e,t){let r=Ot();return N.forEach(t,s=>this.getOverlay(e,s).next(o=>{o!==null&&r.set(s,o);})).next(()=>r);}saveOverlays(e,t,r){return r.forEach((s,o)=>{this.St(e,t,o);}),N.resolve();}removeOverlaysForBatchId(e,t,r){let s=this.qr.get(r);return s!==void 0&&(s.forEach(o=>this.overlays=this.overlays.remove(o)),this.qr.delete(r)),N.resolve();}getOverlaysForCollection(e,t,r){let s=Ot(),o=t.length+1,a=new j(t.child("")),c=this.overlays.getIteratorFrom(a);for(;c.hasNext();){let l=c.getNext().value,h=l.getKey();if(!t.isPrefixOf(h.path))break;h.path.length===o&&l.largestBatchId>r&&s.set(l.getKey(),l);}return N.resolve(s);}getOverlaysForCollectionGroup(e,t,r,s){let o=new ue((h,f)=>h-f),a=this.overlays.getIterator();for(;a.hasNext();){let h=a.getNext().value;if(h.getKey().getCollectionGroup()===t&&h.largestBatchId>r){let f=o.get(h.largestBatchId);f===null&&(f=Ot(),o=o.insert(h.largestBatchId,f)),f.set(h.getKey(),h);}}let c=Ot(),l=o.getIterator();for(;l.hasNext()&&(l.getNext().value.forEach((h,f)=>c.set(h,f)),!(c.size()>=s)););return N.resolve(c);}St(e,t,r){let s=this.overlays.get(r.key);if(s!==null){let a=this.qr.get(s.largestBatchId).delete(r.key);this.qr.set(s.largestBatchId,a);}this.overlays=this.overlays.insert(r.key,new bo(t,r));let o=this.qr.get(t);o===void 0&&(o=W(),this.qr.set(t,o)),this.qr.set(t,o.add(r.key));}};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ko=class{constructor(){this.sessionToken=Se.EMPTY_BYTE_STRING;}getSessionToken(e){return N.resolve(this.sessionToken);}setSessionToken(e,t){return this.sessionToken=t,N.resolve();}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var wr=class{constructor(){this.Qr=new ye(he.$r),this.Ur=new ye(he.Kr);}isEmpty(){return this.Qr.isEmpty();}addReference(e,t){let r=new he(e,t);this.Qr=this.Qr.add(r),this.Ur=this.Ur.add(r);}Wr(e,t){e.forEach(r=>this.addReference(r,t));}removeReference(e,t){this.Gr(new he(e,t));}zr(e,t){e.forEach(r=>this.removeReference(r,t));}jr(e){let t=new j(new ie([])),r=new he(t,e),s=new he(t,e+1),o=[];return this.Ur.forEachInRange([r,s],a=>{this.Gr(a),o.push(a.key);}),o;}Jr(){this.Qr.forEach(e=>this.Gr(e));}Gr(e){this.Qr=this.Qr.delete(e),this.Ur=this.Ur.delete(e);}Hr(e){let t=new j(new ie([])),r=new he(t,e),s=new he(t,e+1),o=W();return this.Ur.forEachInRange([r,s],a=>{o=o.add(a.key);}),o;}containsKey(e){let t=new he(e,0),r=this.Qr.firstAfterOrEqual(t);return r!==null&&e.isEqual(r.key);}},he=class{constructor(e,t){this.key=e,this.Yr=t;}static $r(e,t){return j.comparator(e.key,t.key)||Q(e.Yr,t.Yr);}static Kr(e,t){return Q(e.Yr,t.Yr)||j.comparator(e.key,t.key);}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Go=class{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.tr=1,this.Zr=new ye(he.$r);}checkEmpty(e){return N.resolve(this.mutationQueue.length===0);}addMutationBatch(e,t,r,s){let o=this.tr;this.tr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];let a=new vo(o,t,r,s);this.mutationQueue.push(a);for(let c of s)this.Zr=this.Zr.add(new he(c.key,o)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return N.resolve(a);}lookupMutationBatch(e,t){return N.resolve(this.Xr(t));}getNextMutationBatchAfterBatchId(e,t){let r=t+1,s=this.ei(r),o=s<0?0:s;return N.resolve(this.mutationQueue.length>o?this.mutationQueue[o]:null);}getHighestUnacknowledgedBatchId(){return N.resolve(this.mutationQueue.length===0?Oa:this.tr-1);}getAllMutationBatches(e){return N.resolve(this.mutationQueue.slice());}getAllMutationBatchesAffectingDocumentKey(e,t){let r=new he(t,0),s=new he(t,Number.POSITIVE_INFINITY),o=[];return this.Zr.forEachInRange([r,s],a=>{let c=this.Xr(a.Yr);o.push(c);}),N.resolve(o);}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new ye(Q);return t.forEach(s=>{let o=new he(s,0),a=new he(s,Number.POSITIVE_INFINITY);this.Zr.forEachInRange([o,a],c=>{r=r.add(c.Yr);});}),N.resolve(this.ti(r));}getAllMutationBatchesAffectingQuery(e,t){let r=t.path,s=r.length+1,o=r;j.isDocumentKey(o)||(o=o.child(""));let a=new he(new j(o),0),c=new ye(Q);return this.Zr.forEachWhile(l=>{let h=l.key.path;return!!r.isPrefixOf(h)&&(h.length===s&&(c=c.add(l.Yr)),!0);},a),N.resolve(this.ti(c));}ti(e){let t=[];return e.forEach(r=>{let s=this.Xr(r);s!==null&&t.push(s);}),t;}removeMutationBatch(e,t){ee(this.ni(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Zr;return N.forEach(t.mutations,s=>{let o=new he(s.key,t.batchId);return r=r.delete(o),this.referenceDelegate.markPotentiallyOrphaned(e,s.key);}).next(()=>{this.Zr=r;});}ir(e){}containsKey(e,t){let r=new he(t,0),s=this.Zr.firstAfterOrEqual(r);return N.resolve(t.isEqual(s&&s.key));}performConsistencyCheck(e){return this.mutationQueue.length,N.resolve();}ni(e,t){return this.ei(e);}ei(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId;}Xr(e){let t=this.ei(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t];}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var zo=class{constructor(e){this.ri=e,this.docs=function(){return new ue(j.comparator);}(),this.size=0;}setIndexManager(e){this.indexManager=e;}addEntry(e,t){let r=t.key,s=this.docs.get(r),o=s?s.size:0,a=this.ri(t);return this.docs=this.docs.insert(r,{document:t.mutableCopy(),size:a}),this.size+=a-o,this.indexManager.addToCollectionParentIndex(e,r.path.popLast());}removeEntry(e){let t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size);}getEntry(e,t){let r=this.docs.get(t);return N.resolve(r?r.document.mutableCopy():Oe.newInvalidDocument(t));}getEntries(e,t){let r=ht();return t.forEach(s=>{let o=this.docs.get(s);r=r.insert(s,o?o.document.mutableCopy():Oe.newInvalidDocument(s));}),N.resolve(r);}getDocumentsMatchingQuery(e,t,r,s){let o=ht(),a=t.path,c=new j(a.child("__id-9223372036854775808__")),l=this.docs.getIteratorFrom(c);for(;l.hasNext();){let{key:h,value:{document:f}}=l.getNext();if(!a.isPrefixOf(h.path))break;h.path.length>a.length+1||om(im(f),r)<=0||(s.has(f.key)||zs(t,f))&&(o=o.insert(f.key,f.mutableCopy()));}return N.resolve(o);}getAllFromCollectionGroup(e,t,r,s){K(9500);}ii(e,t){return N.forEach(this.docs,r=>t(r));}newChangeBuffer(e){return new jo(this);}getSize(e){return N.resolve(this.size);}},jo=class extends Lo{constructor(e){super(),this.Nr=e;}applyChanges(e){let t=[];return this.changes.forEach((r,s)=>{s.isValidDocument()?t.push(this.Nr.addEntry(e,s)):this.Nr.removeEntry(r);}),N.waitFor(t);}getFromCache(e,t){return this.Nr.getEntry(e,t);}getAllFromCache(e,t){return this.Nr.getEntries(e,t);}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var $o=class{constructor(e){this.persistence=e,this.si=new lt(t=>Ua(t),Ka),this.lastRemoteSnapshotVersion=$.min(),this.highestTargetId=0,this.oi=0,this._i=new wr(),this.targetCount=0,this.ai=yr.ur();}forEachTarget(e,t){return this.si.forEach((r,s)=>t(s)),N.resolve();}getLastRemoteSnapshotVersion(e){return N.resolve(this.lastRemoteSnapshotVersion);}getHighestSequenceNumber(e){return N.resolve(this.oi);}allocateTargetId(e){return this.highestTargetId=this.ai.next(),N.resolve(this.highestTargetId);}setTargetsMetadata(e,t,r){return r&&(this.lastRemoteSnapshotVersion=r),t>this.oi&&(this.oi=t),N.resolve();}Pr(e){this.si.set(e.target,e);let t=e.targetId;t>this.highestTargetId&&(this.ai=new yr(t),this.highestTargetId=t),e.sequenceNumber>this.oi&&(this.oi=e.sequenceNumber);}addTargetData(e,t){return this.Pr(t),this.targetCount+=1,N.resolve();}updateTargetData(e,t){return this.Pr(t),N.resolve();}removeTargetData(e,t){return this.si.delete(t.target),this._i.jr(t.targetId),this.targetCount-=1,N.resolve();}removeTargets(e,t,r){let s=0,o=[];return this.si.forEach((a,c)=>{c.sequenceNumber<=t&&r.get(c.targetId)===null&&(this.si.delete(a),o.push(this.removeMatchingKeysForTargetId(e,c.targetId)),s++);}),N.waitFor(o).next(()=>s);}getTargetCount(e){return N.resolve(this.targetCount);}getTargetData(e,t){let r=this.si.get(t)||null;return N.resolve(r);}addMatchingKeys(e,t,r){return this._i.Wr(t,r),N.resolve();}removeMatchingKeys(e,t,r){this._i.zr(t,r);let s=this.persistence.referenceDelegate,o=[];return s&&t.forEach(a=>{o.push(s.markPotentiallyOrphaned(e,a));}),N.waitFor(o);}removeMatchingKeysForTargetId(e,t){return this._i.jr(t),N.resolve();}getMatchingKeysForTargetId(e,t){let r=this._i.Hr(t);return N.resolve(r);}containsKey(e,t){return N.resolve(this._i.containsKey(t));}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ts=class{constructor(e,t){this.ui={},this.overlays={},this.ci=new ln(0),this.li=!1,this.li=!0,this.hi=new Ko(),this.referenceDelegate=e(this),this.Pi=new $o(this),this.indexManager=new xo(),this.remoteDocumentCache=function(s){return new zo(s);}(r=>this.referenceDelegate.Ti(r)),this.serializer=new Do(t),this.Ii=new Bo(this.serializer);}start(){return Promise.resolve();}shutdown(){return this.li=!1,Promise.resolve();}get started(){return this.li;}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager;}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new Uo(),this.overlays[e.toKey()]=t),t;}getMutationQueue(e,t){let r=this.ui[e.toKey()];return r||(r=new Go(t,this.referenceDelegate),this.ui[e.toKey()]=r),r;}getGlobalsCache(){return this.hi;}getTargetCache(){return this.Pi;}getRemoteDocumentCache(){return this.remoteDocumentCache;}getBundleCache(){return this.Ii;}runTransaction(e,t,r){U("MemoryPersistence","Starting transaction:",e);let s=new qo(this.ci.next());return this.referenceDelegate.Ei(),r(s).next(o=>this.referenceDelegate.di(s).next(()=>o)).toPromise().then(o=>(s.raiseOnCommittedEvent(),o));}Ai(e,t){return N.or(Object.values(this.ui).map(r=>()=>r.containsKey(e,t)));}},qo=class extends no{constructor(e){super(),this.currentSequenceNumber=e;}},Ho=class n{constructor(e){this.persistence=e,this.Ri=new wr(),this.Vi=null;}static mi(e){return new n(e);}get fi(){if(this.Vi)return this.Vi;throw K(60996);}addReference(e,t,r){return this.Ri.addReference(r,t),this.fi.delete(r.toString()),N.resolve();}removeReference(e,t,r){return this.Ri.removeReference(r,t),this.fi.add(r.toString()),N.resolve();}markPotentiallyOrphaned(e,t){return this.fi.add(t.toString()),N.resolve();}removeTarget(e,t){this.Ri.jr(t.targetId).forEach(s=>this.fi.add(s.toString()));let r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,t.targetId).next(s=>{s.forEach(o=>this.fi.add(o.toString()));}).next(()=>r.removeTargetData(e,t));}Ei(){this.Vi=new Set();}di(e){let t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return N.forEach(this.fi,r=>{let s=j.fromPath(r);return this.gi(e,s).next(o=>{o||t.removeEntry(s,$.min());});}).next(()=>(this.Vi=null,t.apply(e)));}updateLimboDocument(e,t){return this.gi(e,t).next(r=>{r?this.fi.delete(t.toString()):this.fi.add(t.toString());});}Ti(e){return 0;}gi(e,t){return N.or([()=>N.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ai(e,t)]);}},Is=class n{constructor(e,t){this.persistence=e,this.pi=new lt(r=>lm(r.path),(r,s)=>r.isEqual(s)),this.garbageCollector=cg(this,t);}static mi(e,t){return new n(e,t);}Ei(){}di(e){return N.resolve();}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t);}gr(e){let t=this.wr(e);return this.persistence.getTargetCache().getTargetCount(e).next(r=>t.next(s=>r+s));}wr(e){let t=0;return this.pr(e,r=>{t++;}).next(()=>t);}pr(e,t){return N.forEach(this.pi,(r,s)=>this.br(e,r,s).next(o=>o?N.resolve():t(s)));}removeTargets(e,t,r){return this.persistence.getTargetCache().removeTargets(e,t,r);}removeOrphanedDocuments(e,t){let r=0,s=this.persistence.getRemoteDocumentCache(),o=s.newChangeBuffer();return s.ii(e,a=>this.br(e,a,t).next(c=>{c||(r++,o.removeEntry(a,$.min()));})).next(()=>o.apply(e)).next(()=>r);}markPotentiallyOrphaned(e,t){return this.pi.set(t,e.currentSequenceNumber),N.resolve();}removeTarget(e,t){let r=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,r);}addReference(e,t,r){return this.pi.set(r,e.currentSequenceNumber),N.resolve();}removeReference(e,t,r){return this.pi.set(r,e.currentSequenceNumber),N.resolve();}updateLimboDocument(e,t){return this.pi.set(t,e.currentSequenceNumber),N.resolve();}Ti(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=ss(e.data.value)),t;}br(e,t,r){return N.or([()=>this.persistence.Ai(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{let s=this.pi.get(t);return N.resolve(s!==void 0&&s>r);}]);}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e);}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Qo=class n{constructor(e,t,r,s){this.targetId=e,this.fromCache=t,this.Es=r,this.ds=s;}static As(e,t){let r=W(),s=W();for(let o of t.docChanges)switch(o.type){case 0:r=r.add(o.doc.key);break;case 1:s=s.add(o.doc.key);}return new n(e,t.fromCache,r,s);}};/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Wo=class{constructor(){this._documentReadCount=0;}get documentReadCount(){return this._documentReadCount;}incrementDocumentReadCount(e){this._documentReadCount+=e;}};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Jo=class{constructor(){this.Rs=!1,this.Vs=!1,this.fs=100,this.gs=function(){return wu()?8:cm(yu())>0?6:4;}();}initialize(e,t){this.ps=e,this.indexManager=t,this.Rs=!0;}getDocumentsMatchingQuery(e,t,r,s){let o={result:null};return this.ys(e,t).next(a=>{o.result=a;}).next(()=>{if(!o.result)return this.ws(e,t,s,r).next(a=>{o.result=a;});}).next(()=>{if(o.result)return;let a=new Wo();return this.Ss(e,t,a).next(c=>{if(o.result=c,this.Vs)return this.bs(e,t,a,c.size);});}).next(()=>o.result);}bs(e,t,r,s){return r.documentReadCount<this.fs?(en()<=X.DEBUG&&U("QueryEngine","SDK will not create cache indexes for query:",tn(t),"since it only creates cache indexes for collection contains","more than or equal to",this.fs,"documents"),N.resolve()):(en()<=X.DEBUG&&U("QueryEngine","Query:",tn(t),"scans",r.documentReadCount,"local documents and returns",s,"documents as results."),r.documentReadCount>this.gs*s?(en()<=X.DEBUG&&U("QueryEngine","The SDK decides to create cache indexes for query:",tn(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,He(t))):N.resolve());}ys(e,t){if(nl(t))return N.resolve(null);let r=He(t);return this.indexManager.getIndexType(e,r).next(s=>s===0?null:(t.limit!==null&&s===1&&(t=yo(t,null,"F"),r=He(t)),this.indexManager.getDocumentsMatchingTarget(e,r).next(o=>{let a=W(...o);return this.ps.getDocuments(e,a).next(c=>this.indexManager.getMinOffset(e,r).next(l=>{let h=this.Ds(t,c);return this.Cs(t,h,a,l.readTime)?this.ys(e,yo(t,null,"F")):this.vs(e,h,t,l);}));})));}ws(e,t,r,s){return nl(t)||s.isEqual($.min())?N.resolve(null):this.ps.getDocuments(e,r).next(o=>{let a=this.Ds(t,o);return this.Cs(t,a,r,s)?N.resolve(null):(en()<=X.DEBUG&&U("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),tn(t)),this.vs(e,a,t,sm(s,hr)).next(c=>c));});}Ds(e,t){let r=new ye(oh(e));return t.forEach((s,o)=>{zs(e,o)&&(r=r.add(o));}),r;}Cs(e,t,r,s){if(e.limit===null)return!1;if(r.size!==t.size)return!0;let o=e.limitType==="F"?t.last():t.first();return!!o&&(o.hasPendingWrites||o.version.compareTo(s)>0);}Ss(e,t,r){return en()<=X.DEBUG&&U("QueryEngine","Using full collection scan to execute query:",tn(t)),this.ps.getDocumentsMatchingQuery(e,t,Bt.min(),r);}vs(e,t,r,s){return this.ps.getDocumentsMatchingQuery(e,r,s).next(o=>(t.forEach(a=>{o=o.insert(a.key,a);}),o));}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ja="LocalStore",ug=3e8,Xo=class{constructor(e,t,r,s){this.persistence=e,this.Fs=t,this.serializer=s,this.Ms=new ue(Q),this.xs=new lt(o=>Ua(o),Ka),this.Os=new Map(),this.Ns=e.getRemoteDocumentCache(),this.Pi=e.getTargetCache(),this.Ii=e.getBundleCache(),this.Bs(r);}Bs(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Fo(this.Ns,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Ns.setIndexManager(this.indexManager),this.Fs.initialize(this.localDocuments,this.indexManager);}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.Ms));}};function lg(n,e,t,r){return new Xo(n,e,t,r);}async function Rh(n,e){let t=q(n);return await t.persistence.runTransaction("Handle user change","readonly",r=>{let s;return t.mutationQueue.getAllMutationBatches(r).next(o=>(s=o,t.Bs(e),t.mutationQueue.getAllMutationBatches(r))).next(o=>{let a=[],c=[],l=W();for(let h of s){a.push(h.batchId);for(let f of h.mutations)l=l.add(f.key);}for(let h of o){c.push(h.batchId);for(let f of h.mutations)l=l.add(f.key);}return t.localDocuments.getDocuments(r,l).next(h=>({Ls:h,removedBatchIds:a,addedBatchIds:c}));});});}function hg(n,e){let t=q(n);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",r=>{let s=e.batch.keys(),o=t.Ns.newChangeBuffer({trackRemovals:!0});return function(c,l,h,f){let p=h.batch,g=p.keys(),T=N.resolve();return g.forEach(C=>{T=T.next(()=>f.getEntry(l,C)).next(A=>{let R=h.docVersions.get(C);ee(R!==null,48541),A.version.compareTo(R)<0&&(p.applyToRemoteDocument(A,h),A.isValidDocument()&&(A.setReadTime(h.commitVersion),f.addEntry(A)));});}),T.next(()=>c.mutationQueue.removeMutationBatch(l,p));}(t,r,e,o).next(()=>o.apply(r)).next(()=>t.mutationQueue.performConsistencyCheck(r)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(r,s,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,function(c){let l=W();for(let h=0;h<c.mutationResults.length;++h)c.mutationResults[h].transformResults.length>0&&(l=l.add(c.batch.mutations[h].key));return l;}(e))).next(()=>t.localDocuments.getDocuments(r,s));});}function Ph(n){let e=q(n);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.Pi.getLastRemoteSnapshotVersion(t));}function dg(n,e){let t=q(n),r=e.snapshotVersion,s=t.Ms;return t.persistence.runTransaction("Apply remote event","readwrite-primary",o=>{let a=t.Ns.newChangeBuffer({trackRemovals:!0});s=t.Ms;let c=[];e.targetChanges.forEach((f,p)=>{let g=s.get(p);if(!g)return;c.push(t.Pi.removeMatchingKeys(o,f.removedDocuments,p).next(()=>t.Pi.addMatchingKeys(o,f.addedDocuments,p)));let T=g.withSequenceNumber(o.currentSequenceNumber);e.targetMismatches.get(p)!==null?T=T.withResumeToken(Se.EMPTY_BYTE_STRING,$.min()).withLastLimboFreeSnapshotVersion($.min()):f.resumeToken.approximateByteSize()>0&&(T=T.withResumeToken(f.resumeToken,r)),s=s.insert(p,T),function(A,R,V){return A.resumeToken.approximateByteSize()===0||R.snapshotVersion.toMicroseconds()-A.snapshotVersion.toMicroseconds()>=ug?!0:V.addedDocuments.size+V.modifiedDocuments.size+V.removedDocuments.size>0;}(g,T,f)&&c.push(t.Pi.updateTargetData(o,T));});let l=ht(),h=W();if(e.documentUpdates.forEach(f=>{e.resolvedLimboDocuments.has(f)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(o,f));}),c.push(fg(o,a,e.documentUpdates).next(f=>{l=f.ks,h=f.qs;})),!r.isEqual($.min())){let f=t.Pi.getLastRemoteSnapshotVersion(o).next(p=>t.Pi.setTargetsMetadata(o,o.currentSequenceNumber,r));c.push(f);}return N.waitFor(c).next(()=>a.apply(o)).next(()=>t.localDocuments.getLocalViewOfDocuments(o,l,h)).next(()=>l);}).then(o=>(t.Ms=s,o));}function fg(n,e,t){let r=W(),s=W();return t.forEach(o=>r=r.add(o)),e.getEntries(n,r).next(o=>{let a=ht();return t.forEach((c,l)=>{let h=o.get(c);l.isFoundDocument()!==h.isFoundDocument()&&(s=s.add(c)),l.isNoDocument()&&l.version.isEqual($.min())?(e.removeEntry(c,l.readTime),a=a.insert(c,l)):!h.isValidDocument()||l.version.compareTo(h.version)>0||l.version.compareTo(h.version)===0&&h.hasPendingWrites?(e.addEntry(l),a=a.insert(c,l)):U(ja,"Ignoring outdated watch update for ",c,". Current version:",h.version," Watch version:",l.version);}),{ks:a,qs:s};});}function mg(n,e){let t=q(n);return t.persistence.runTransaction("Get next mutation batch","readonly",r=>(e===void 0&&(e=Oa),t.mutationQueue.getNextMutationBatchAfterBatchId(r,e)));}function gg(n,e){let t=q(n);return t.persistence.runTransaction("Allocate target","readwrite",r=>{let s;return t.Pi.getTargetData(r,e).next(o=>o?(s=o,N.resolve(s)):t.Pi.allocateTargetId(r).next(a=>(s=new pr(e,a,"TargetPurposeListen",r.currentSequenceNumber),t.Pi.addTargetData(r,s).next(()=>s))));}).then(r=>{let s=t.Ms.get(r.targetId);return(s===null||r.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(t.Ms=t.Ms.insert(r.targetId,r),t.xs.set(e,r.targetId)),r;});}async function Yo(n,e,t){let r=q(n),s=r.Ms.get(e),o=t?"readwrite":"readwrite-primary";try{t||(await r.persistence.runTransaction("Release target",o,a=>r.persistence.referenceDelegate.removeTarget(a,s)));}catch(a){if(!Dn(a))throw a;U(ja,"Failed to update sequence numbers for target ".concat(e,": ").concat(a));}r.Ms=r.Ms.remove(e),r.xs.delete(s.target);}function ml(n,e,t){let r=q(n),s=$.min(),o=W();return r.persistence.runTransaction("Execute query","readwrite",a=>function(l,h,f){let p=q(l),g=p.xs.get(f);return g!==void 0?N.resolve(p.Ms.get(g)):p.Pi.getTargetData(h,f);}(r,a,He(e)).next(c=>{if(c)return s=c.lastLimboFreeSnapshotVersion,r.Pi.getMatchingKeysForTargetId(a,c.targetId).next(l=>{o=l;});}).next(()=>r.Fs.getDocumentsMatchingQuery(a,e,t?s:$.min(),t?o:W())).next(c=>(pg(r,Rm(e),c),{documents:c,Qs:o})));}function pg(n,e,t){let r=n.Os.get(e)||$.min();t.forEach((s,o)=>{o.readTime.compareTo(r)>0&&(r=o.readTime);}),n.Os.set(e,r);}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ss=class{constructor(){this.activeTargetIds=km();}zs(e){this.activeTargetIds=this.activeTargetIds.add(e);}js(e){this.activeTargetIds=this.activeTargetIds.delete(e);}Gs(){let e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e);}};var Zo=class{constructor(){this.Mo=new Ss(),this.xo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null;}addPendingMutation(e){}updateMutationState(e,t,r){}addLocalQueryTarget(e,t=!0){return t&&this.Mo.zs(e),this.xo[e]||"not-current";}updateQueryState(e,t,r){this.xo[e]=t;}removeLocalQueryTarget(e){this.Mo.js(e);}isLocalQueryTarget(e){return this.Mo.activeTargetIds.has(e);}clearQueryState(e){delete this.xo[e];}getAllActiveQueryTargets(){return this.Mo.activeTargetIds;}isActiveQueryTarget(e){return this.Mo.activeTargetIds.has(e);}start(){return this.Mo=new Ss(),Promise.resolve();}handleUserChange(e,t,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ea=class{Oo(e){}shutdown(){}};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var gl="ConnectivityMonitor",As=class{constructor(){this.No=()=>this.Bo(),this.Lo=()=>this.ko(),this.qo=[],this.Qo();}Oo(e){this.qo.push(e);}shutdown(){window.removeEventListener("online",this.No),window.removeEventListener("offline",this.Lo);}Qo(){window.addEventListener("online",this.No),window.addEventListener("offline",this.Lo);}Bo(){U(gl,"Network connectivity changed: AVAILABLE");for(let e of this.qo)e(0);}ko(){U(gl,"Network connectivity changed: UNAVAILABLE");for(let e of this.qo)e(1);}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0;}};/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var rs=null;function ta(){return rs===null?rs=function(){return 268435456+Math.round(2147483648*Math.random());}():rs++,"0x"+rs.toString(16);}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var $i="RestConnection",yg={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"},na=class{get $o(){return!1;}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;let t=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.Uo=t+"://"+e.host,this.Ko="projects/".concat(r,"/databases/").concat(s),this.Wo=this.databaseId.database===ds?"project_id=".concat(r):"project_id=".concat(r,"&database_id=").concat(s);}Go(e,t,r,s,o){let a=ta(),c=this.zo(e,t.toUriEncodedString());U($i,"Sending RPC '".concat(e,"' ").concat(a,":"),c,r);let l={"google-cloud-resource-prefix":this.Ko,"x-goog-request-params":this.Wo};this.jo(l,s,o);let{host:h}=new URL(c),f=Wr(h);return this.Jo(e,c,l,r,f).then(p=>(U($i,"Received RPC '".concat(e,"' ").concat(a,": "),p),p),p=>{throw cn($i,"RPC '".concat(e,"' ").concat(a," failed with error: "),p,"url: ",c,"request:",r),p;});}Ho(e,t,r,s,o,a){return this.Go(e,t,r,s,o);}jo(e,t,r){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+Rn;}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((s,o)=>e[o]=s),r&&r.headers.forEach((s,o)=>e[o]=s);}zo(e,t){let r=yg[e];return"".concat(this.Uo,"/v1/").concat(t,":").concat(r);}terminate(){}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ra=class{constructor(e){this.Yo=e.Yo,this.Zo=e.Zo;}Xo(e){this.e_=e;}t_(e){this.n_=e;}r_(e){this.i_=e;}onMessage(e){this.s_=e;}close(){this.Zo();}send(e){this.Yo(e);}o_(){this.e_();}__(){this.n_();}a_(e){this.i_(e);}u_(e){this.s_(e);}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ie="WebChannelConnection",sa=class extends na{constructor(e){super(e),this.c_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions;}Jo(e,t,r,s,o){let a=ta();return new Promise((c,l)=>{let h=new Bi();h.setWithCredentials(!0),h.listenOnce(Ui.COMPLETE,()=>{try{switch(h.getLastErrorCode()){case nr.NO_ERROR:let p=h.getResponseJson();U(Ie,"XHR for RPC '".concat(e,"' ").concat(a," received:"),JSON.stringify(p)),c(p);break;case nr.TIMEOUT:U(Ie,"RPC '".concat(e,"' ").concat(a," timed out")),l(new B(x.DEADLINE_EXCEEDED,"Request time out"));break;case nr.HTTP_ERROR:let g=h.getStatus();if(U(Ie,"RPC '".concat(e,"' ").concat(a," failed with status:"),g,"response text:",h.getResponseText()),g>0){var _T;let T=h.getResponseJson();Array.isArray(T)&&(T=T[0]);let C=(_T=T)===null||_T===void 0?void 0:_T.error;if(C&&C.status&&C.message){let A=function(V){let k=V.toLowerCase().replace(/_/g,"-");return Object.values(x).indexOf(k)>=0?k:x.UNKNOWN;}(C.status);l(new B(A,C.message));}else l(new B(x.UNKNOWN,"Server responded with status "+h.getStatus()));}else l(new B(x.UNAVAILABLE,"Connection failed."));break;default:K(9055,{l_:e,streamId:a,h_:h.getLastErrorCode(),P_:h.getLastError()});}}finally{U(Ie,"RPC '".concat(e,"' ").concat(a," completed."));}});let f=JSON.stringify(s);U(Ie,"RPC '".concat(e,"' ").concat(a," sending request:"),s),h.send(t,"POST",f,r,15);});}T_(e,t,r){let s=ta(),o=[this.Uo,"/","google.firestore.v1.Firestore","/",e,"/channel"],a=zi(),c=Gi(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:"projects/".concat(this.databaseId.projectId,"/databases/").concat(this.databaseId.database)},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},h=this.longPollingOptions.timeoutSeconds;h!==void 0&&(l.longPollingTimeout=Math.round(1e3*h)),this.useFetchStreams&&(l.useFetchStreams=!0),this.jo(l.initMessageHeaders,t,r),l.encodeInitMessageHeaders=!0;let f=o.join("");U(Ie,"Creating RPC '".concat(e,"' stream ").concat(s,": ").concat(f),l);let p=a.createWebChannel(f,l);this.I_(p);let g=!1,T=!1,C=new ra({Yo:R=>{T?U(Ie,"Not sending because RPC '".concat(e,"' stream ").concat(s," is closed:"),R):(g||(U(Ie,"Opening RPC '".concat(e,"' stream ").concat(s," transport.")),p.open(),g=!0),U(Ie,"RPC '".concat(e,"' stream ").concat(s," sending:"),R),p.send(R));},Zo:()=>p.close()}),A=(R,V,k)=>{R.listen(V,F=>{try{k(F);}catch(Y){setTimeout(()=>{throw Y;},0);}});};return A(p,Zt.EventType.OPEN,()=>{T||(U(Ie,"RPC '".concat(e,"' stream ").concat(s," transport opened.")),C.o_());}),A(p,Zt.EventType.CLOSE,()=>{T||(T=!0,U(Ie,"RPC '".concat(e,"' stream ").concat(s," transport closed")),C.a_(),this.E_(p));}),A(p,Zt.EventType.ERROR,R=>{T||(T=!0,cn(Ie,"RPC '".concat(e,"' stream ").concat(s," transport errored. Name:"),R.name,"Message:",R.message),C.a_(new B(x.UNAVAILABLE,"The operation could not be completed")));}),A(p,Zt.EventType.MESSAGE,R=>{if(!T){var _k$;let V=R.data[0];ee(!!V,16349);let k=V,F=(k===null||k===void 0?void 0:k.error)||((_k$=k[0])===null||_k$===void 0?void 0:_k$.error);if(F){U(Ie,"RPC '".concat(e,"' stream ").concat(s," received error:"),F);let Y=F.status,z=function(_){let y=le[_];if(y!==void 0)return wh(y);}(Y),ne=F.message;z===void 0&&(z=x.INTERNAL,ne="Unknown error status: "+Y+" with message "+F.message),T=!0,C.a_(new B(z,ne)),p.close();}else U(Ie,"RPC '".concat(e,"' stream ").concat(s," received:"),V),C.u_(V);}}),A(c,Ki.STAT_EVENT,R=>{R.stat===es.PROXY?U(Ie,"RPC '".concat(e,"' stream ").concat(s," detected buffering proxy")):R.stat===es.NOPROXY&&U(Ie,"RPC '".concat(e,"' stream ").concat(s," detected no buffering proxy"));}),setTimeout(()=>{C.__();},0),C;}terminate(){this.c_.forEach(e=>e.close()),this.c_=[];}I_(e){this.c_.push(e);}E_(e){this.c_=this.c_.filter(t=>t===e);}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qi(){return typeof document<"u"?document:null;}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function js(n){return new Ao(n,!0);}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var _r=class{constructor(e,t,r=1e3,s=1.5,o=6e4){this.Mi=e,this.timerId=t,this.d_=r,this.A_=s,this.R_=o,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset();}reset(){this.V_=0;}g_(){this.V_=this.R_;}p_(e){this.cancel();let t=Math.floor(this.V_+this.y_()),r=Math.max(0,Date.now()-this.f_),s=Math.max(0,t-r);s>0&&U("ExponentialBackoff","Backing off for ".concat(s," ms (base delay: ").concat(this.V_," ms, delay with jitter: ").concat(t," ms, last attempt: ").concat(r," ms ago)")),this.m_=this.Mi.enqueueAfterDelay(this.timerId,s,()=>(this.f_=Date.now(),e())),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_);}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null);}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null);}y_(){return(Math.random()-.5)*this.V_;}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var pl="PersistentStream",Cs=class{constructor(e,t,r,s,o,a,c,l){this.Mi=e,this.S_=r,this.b_=s,this.connection=o,this.authCredentialsProvider=a,this.appCheckCredentialsProvider=c,this.listener=l,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new _r(e,t);}x_(){return this.state===1||this.state===5||this.O_();}O_(){return this.state===2||this.state===3;}start(){this.F_=0,this.state!==4?this.auth():this.N_();}async stop(){this.x_()&&(await this.close(0));}B_(){this.state=0,this.M_.reset();}L_(){this.O_()&&this.C_===null&&(this.C_=this.Mi.enqueueAfterDelay(this.S_,6e4,()=>this.k_()));}q_(e){this.Q_(),this.stream.send(e);}async k_(){if(this.O_())return this.close(0);}Q_(){this.C_&&(this.C_.cancel(),this.C_=null);}U_(){this.v_&&(this.v_.cancel(),this.v_=null);}async close(e,t){this.Q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===x.RESOURCE_EXHAUSTED?(at(t.toString()),at("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===x.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.K_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.r_(t);}K_(){}auth(){this.state=1;let e=this.W_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([r,s])=>{this.D_===t&&this.G_(r,s);},r=>{e(()=>{let s=new B(x.UNKNOWN,"Fetching auth token failed: "+r.message);return this.z_(s);});});}G_(e,t){let r=this.W_(this.D_);this.stream=this.j_(e,t),this.stream.Xo(()=>{r(()=>this.listener.Xo());}),this.stream.t_(()=>{r(()=>(this.state=2,this.v_=this.Mi.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.t_()));}),this.stream.r_(s=>{r(()=>this.z_(s));}),this.stream.onMessage(s=>{r(()=>++this.F_==1?this.J_(s):this.onNext(s));});}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start();});}z_(e){return U(pl,"close with error: ".concat(e)),this.stream=null,this.close(4,e);}W_(e){return t=>{this.Mi.enqueueAndForget(()=>this.D_===e?t():(U(pl,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()));};}},ia=class extends Cs{constructor(e,t,r,s,o,a){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,r,s,a),this.serializer=o;}j_(e,t){return this.connection.T_("Listen",e,t);}J_(e){return this.onNext(e);}onNext(e){this.M_.reset();let t=Jm(this.serializer,e),r=function(o){if(!("targetChange"in o))return $.min();let a=o.targetChange;return a.targetIds&&a.targetIds.length?$.min():a.readTime?ke(a.readTime):$.min();}(e);return this.listener.H_(t,r);}Y_(e){let t={};t.database=Po(this.serializer),t.addTarget=function(o,a){let c,l=a.target;if(c=po(l)?{documents:Ym(o,l)}:{query:Zm(o,l).ft},c.targetId=a.targetId,a.resumeToken.approximateByteSize()>0){c.resumeToken=_h(o,a.resumeToken);let h=Co(o,a.expectedCount);h!==null&&(c.expectedCount=h);}else if(a.snapshotVersion.compareTo($.min())>0){c.readTime=vs(o,a.snapshotVersion.toTimestamp());let h=Co(o,a.expectedCount);h!==null&&(c.expectedCount=h);}return c;}(this.serializer,e);let r=tg(this.serializer,e);r&&(t.labels=r),this.q_(t);}Z_(e){let t={};t.database=Po(this.serializer),t.removeTarget=e,this.q_(t);}},oa=class extends Cs{constructor(e,t,r,s,o,a){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,r,s,a),this.serializer=o;}get X_(){return this.F_>0;}start(){this.lastStreamToken=void 0,super.start();}K_(){this.X_&&this.ea([]);}j_(e,t){return this.connection.T_("Write",e,t);}J_(e){return ee(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,ee(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta();}onNext(e){ee(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();let t=Xm(e.writeResults,e.commitTime),r=ke(e.commitTime);return this.listener.na(r,t);}ra(){let e={};e.database=Po(this.serializer),this.q_(e);}ea(e){let t={streamToken:this.lastStreamToken,writes:e.map(r=>Th(this.serializer,r))};this.q_(t);}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var aa=class{},ca=class extends aa{constructor(e,t,r,s){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=r,this.serializer=s,this.ia=!1;}sa(){if(this.ia)throw new B(x.FAILED_PRECONDITION,"The client has already been terminated.");}Go(e,t,r,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,a])=>this.connection.Go(e,Ro(t,r),s,o,a)).catch(o=>{throw o.name==="FirebaseError"?(o.code===x.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new B(x.UNKNOWN,o.toString());});}Ho(e,t,r,s,o){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([a,c])=>this.connection.Ho(e,Ro(t,r),s,a,c,o)).catch(a=>{throw a.name==="FirebaseError"?(a.code===x.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),a):new B(x.UNKNOWN,a.toString());});}terminate(){this.ia=!0,this.connection.terminate();}},ua=class{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0;}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())));}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la("Connection failed 1 times. Most recent error: ".concat(e.toString())),this.ca("Offline")));}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e);}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e));}la(e){let t="Could not reach Cloud Firestore backend. ".concat(e,"\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.");this.aa?(at(t),this.aa=!1):U("OnlineStateTracker",t);}Pa(){this._a!==null&&(this._a.cancel(),this._a=null);}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var jt="RemoteStore",la=class{constructor(e,t,r,s,o){this.localStore=e,this.datastore=t,this.asyncQueue=r,this.remoteSyncer={},this.Ta=[],this.Ia=new Map(),this.Ea=new Set(),this.da=[],this.Aa=o,this.Aa.Oo(a=>{r.enqueueAndForget(async()=>{$t(this)&&(U(jt,"Restarting streams for network reachability change."),await async function(l){let h=q(l);h.Ea.add(4),await Ar(h),h.Ra.set("Unknown"),h.Ea.delete(4),await $s(h);}(this));});}),this.Ra=new ua(r,s);}};async function $s(n){if($t(n))for(let e of n.da)await e(!0);}async function Ar(n){for(let e of n.da)await e(!1);}function Dh(n,e){let t=q(n);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),Qa(t)?Ha(t):xn(t).O_()&&qa(t,e));}function $a(n,e){let t=q(n),r=xn(t);t.Ia.delete(e),r.O_()&&xh(t,e),t.Ia.size===0&&(r.O_()?r.L_():$t(t)&&t.Ra.set("Unknown"));}function qa(n,e){if(n.Va.Ue(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo($.min())>0){let t=n.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t);}xn(n).Y_(e);}function xh(n,e){n.Va.Ue(e),xn(n).Z_(e);}function Ha(n){n.Va=new So({getRemoteKeysForTarget:e=>n.remoteSyncer.getRemoteKeysForTarget(e),At:e=>n.Ia.get(e)||null,ht:()=>n.datastore.serializer.databaseId}),xn(n).start(),n.Ra.ua();}function Qa(n){return $t(n)&&!xn(n).x_()&&n.Ia.size>0;}function $t(n){return q(n).Ea.size===0;}function Vh(n){n.Va=void 0;}async function wg(n){n.Ra.set("Online");}async function _g(n){n.Ia.forEach((e,t)=>{qa(n,e);});}async function vg(n,e){Vh(n),Qa(n)?(n.Ra.ha(e),Ha(n)):n.Ra.set("Unknown");}async function Eg(n,e,t){if(n.Ra.set("Online"),e instanceof ws&&e.state===2&&e.cause)try{await async function(s,o){let a=o.cause;for(let c of o.targetIds)s.Ia.has(c)&&(await s.remoteSyncer.rejectListen(c,a),s.Ia.delete(c),s.Va.removeTarget(c));}(n,e);}catch(r){U(jt,"Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Rs(n,r);}else if(e instanceof on?n.Va.Ze(e):e instanceof ys?n.Va.st(e):n.Va.tt(e),!t.isEqual($.min()))try{let r=await Ph(n.localStore);t.compareTo(r)>=0&&(await function(o,a){let c=o.Va.Tt(a);return c.targetChanges.forEach((l,h)=>{if(l.resumeToken.approximateByteSize()>0){let f=o.Ia.get(h);f&&o.Ia.set(h,f.withResumeToken(l.resumeToken,a));}}),c.targetMismatches.forEach((l,h)=>{let f=o.Ia.get(l);if(!f)return;o.Ia.set(l,f.withResumeToken(Se.EMPTY_BYTE_STRING,f.snapshotVersion)),xh(o,l);let p=new pr(f.target,l,h,f.sequenceNumber);qa(o,p);}),o.remoteSyncer.applyRemoteEvent(c);}(n,t));}catch(r){U(jt,"Failed to raise snapshot:",r),await Rs(n,r);}}async function Rs(n,e,t){if(!Dn(e))throw e;n.Ea.add(1),await Ar(n),n.Ra.set("Offline"),t||(t=()=>Ph(n.localStore)),n.asyncQueue.enqueueRetryable(async()=>{U(jt,"Retrying IndexedDB access"),await t(),n.Ea.delete(1),await $s(n);});}function Nh(n,e){return e().catch(t=>Rs(n,t,e));}async function qs(n){let e=q(n),t=St(e),r=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:Oa;for(;bg(e);)try{let s=await mg(e.localStore,r);if(s===null){e.Ta.length===0&&t.L_();break;}r=s.batchId,Tg(e,s);}catch(s){await Rs(e,s);}kh(e)&&Oh(e);}function bg(n){return $t(n)&&n.Ta.length<10;}function Tg(n,e){n.Ta.push(e);let t=St(n);t.O_()&&t.X_&&t.ea(e.mutations);}function kh(n){return $t(n)&&!St(n).x_()&&n.Ta.length>0;}function Oh(n){St(n).start();}async function Ig(n){St(n).ra();}async function Sg(n){let e=St(n);for(let t of n.Ta)e.ea(t.mutations);}async function Ag(n,e,t){let r=n.Ta.shift(),s=Eo.from(r,e,t);await Nh(n,()=>n.remoteSyncer.applySuccessfulWrite(s)),await qs(n);}async function Cg(n,e){e&&St(n).X_&&(await async function(r,s){if(function(a){return yh(a)&&a!==x.ABORTED;}(s.code)){let o=r.Ta.shift();St(r).B_(),await Nh(r,()=>r.remoteSyncer.rejectFailedWrite(o.batchId,s)),await qs(r);}}(n,e)),kh(n)&&Oh(n);}async function yl(n,e){let t=q(n);t.asyncQueue.verifyOperationInProgress(),U(jt,"RemoteStore received new credentials");let r=$t(t);t.Ea.add(3),await Ar(t),r&&t.Ra.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await $s(t);}async function Rg(n,e){let t=q(n);e?(t.Ea.delete(2),await $s(t)):e||(t.Ea.add(2),await Ar(t),t.Ra.set("Unknown"));}function xn(n){return n.ma||(n.ma=function(t,r,s){let o=q(t);return o.sa(),new ia(r,o.connection,o.authCredentials,o.appCheckCredentials,o.serializer,s);}(n.datastore,n.asyncQueue,{Xo:wg.bind(null,n),t_:_g.bind(null,n),r_:vg.bind(null,n),H_:Eg.bind(null,n)}),n.da.push(async e=>{e?(n.ma.B_(),Qa(n)?Ha(n):n.Ra.set("Unknown")):(await n.ma.stop(),Vh(n));})),n.ma;}function St(n){return n.fa||(n.fa=function(t,r,s){let o=q(t);return o.sa(),new oa(r,o.connection,o.authCredentials,o.appCheckCredentials,o.serializer,s);}(n.datastore,n.asyncQueue,{Xo:()=>Promise.resolve(),t_:Ig.bind(null,n),r_:Cg.bind(null,n),ta:Sg.bind(null,n),na:Ag.bind(null,n)}),n.da.push(async e=>{e?(n.fa.B_(),await qs(n)):(await n.fa.stop(),n.Ta.length>0&&(U(jt,"Stopping write stream with ".concat(n.Ta.length," pending writes")),n.Ta=[]));})),n.fa;}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ha=class n{constructor(e,t,r,s,o){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=r,this.op=s,this.removalCallback=o,this.deferred=new Fe(),this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(a=>{});}get promise(){return this.deferred.promise;}static createAndSchedule(e,t,r,s,o){let a=Date.now()+r,c=new n(e,t,a,s,o);return c.start(r),c;}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e);}skipDelay(){return this.handleDelayElapsed();}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new B(x.CANCELLED,"Operation cancelled"+(e?": "+e:""))));}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve());}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null);}};function Wa(n,e){if(at("AsyncQueue","".concat(e,": ").concat(n)),Dn(n))return new B(x.UNAVAILABLE,"".concat(e,": ").concat(n));throw n;}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ps=class n{static emptySet(e){return new n(e.comparator);}constructor(e){this.comparator=e?(t,r)=>e(t,r)||j.comparator(t.key,r.key):(t,r)=>j.comparator(t.key,r.key),this.keyedMap=rr(),this.sortedSet=new ue(this.comparator);}has(e){return this.keyedMap.get(e)!=null;}get(e){return this.keyedMap.get(e);}first(){return this.sortedSet.minKey();}last(){return this.sortedSet.maxKey();}isEmpty(){return this.sortedSet.isEmpty();}indexOf(e){let t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1;}get size(){return this.sortedSet.size;}forEach(e){this.sortedSet.inorderTraversal((t,r)=>(e(t),!1));}add(e){let t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null));}delete(e){let t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this;}isEqual(e){if(!(e instanceof n)||this.size!==e.size)return!1;let t=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;t.hasNext();){let s=t.getNext().key,o=r.getNext().key;if(!s.isEqual(o))return!1;}return!0;}toString(){let e=[];return this.forEach(t=>{e.push(t.toString());}),e.length===0?"DocumentSet ()":"DocumentSet (\n  "+e.join("  \n")+"\n)";}copy(e,t){let r=new n();return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=t,r;}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ds=class{constructor(){this.ga=new ue(j.comparator);}track(e){let t=e.doc.key,r=this.ga.get(t);r?e.type!==0&&r.type===3?this.ga=this.ga.insert(t,e):e.type===3&&r.type!==1?this.ga=this.ga.insert(t,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.ga=this.ga.remove(t):e.type===1&&r.type===2?this.ga=this.ga.insert(t,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):K(63341,{Rt:e,pa:r}):this.ga=this.ga.insert(t,e);}ya(){let e=[];return this.ga.inorderTraversal((t,r)=>{e.push(r);}),e;}},En=class n{constructor(e,t,r,s,o,a,c,l,h){this.query=e,this.docs=t,this.oldDocs=r,this.docChanges=s,this.mutatedKeys=o,this.fromCache=a,this.syncStateChanged=c,this.excludesMetadataChanges=l,this.hasCachedResults=h;}static fromInitialDocuments(e,t,r,s,o){let a=[];return t.forEach(c=>{a.push({type:0,doc:c});}),new n(e,t,Ps.emptySet(t),a,r,s,!0,!1,o);}get hasPendingWrites(){return!this.mutatedKeys.isEmpty();}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Gs(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;let t=this.docChanges,r=e.docChanges;if(t.length!==r.length)return!1;for(let s=0;s<t.length;s++)if(t[s].type!==r[s].type||!t[s].doc.isEqual(r[s].doc))return!1;return!0;}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var da=class{constructor(){this.wa=void 0,this.Sa=[];}ba(){return this.Sa.some(e=>e.Da());}},fa=class{constructor(){this.queries=wl(),this.onlineState="Unknown",this.Ca=new Set();}terminate(){(function(t,r){let s=q(t),o=s.queries;s.queries=wl(),o.forEach((a,c)=>{for(let l of c.Sa)l.onError(r);});})(this,new B(x.ABORTED,"Firestore shutting down"));}};function wl(){return new lt(n=>ih(n),Gs);}async function Ja(n,e){let t=q(n),r=3,s=e.query,o=t.queries.get(s);o?!o.ba()&&e.Da()&&(r=2):(o=new da(),r=e.Da()?0:1);try{switch(r){case 0:o.wa=await t.onListen(s,!0);break;case 1:o.wa=await t.onListen(s,!1);break;case 2:await t.onFirstRemoteStoreListen(s);}}catch(a){let c=Wa(a,"Initialization of query '".concat(tn(e.query),"' failed"));return void e.onError(c);}t.queries.set(s,o),o.Sa.push(e),e.va(t.onlineState),o.wa&&e.Fa(o.wa)&&Ya(t);}async function Xa(n,e){let t=q(n),r=e.query,s=3,o=t.queries.get(r);if(o){let a=o.Sa.indexOf(e);a>=0&&(o.Sa.splice(a,1),o.Sa.length===0?s=e.Da()?0:1:!o.ba()&&e.Da()&&(s=2));}switch(s){case 0:return t.queries.delete(r),t.onUnlisten(r,!0);case 1:return t.queries.delete(r),t.onUnlisten(r,!1);case 2:return t.onLastRemoteStoreUnlisten(r);default:return;}}function Pg(n,e){let t=q(n),r=!1;for(let s of e){let o=s.query,a=t.queries.get(o);if(a){for(let c of a.Sa)c.Fa(s)&&(r=!0);a.wa=s;}}r&&Ya(t);}function Dg(n,e,t){let r=q(n),s=r.queries.get(e);if(s)for(let o of s.Sa)o.onError(t);r.queries.delete(e);}function Ya(n){n.Ca.forEach(e=>{e.next();});}var ma,_l;(_l=ma||(ma={})).Ma="default",_l.Cache="cache";var vr=class{constructor(e,t,r){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=r||{};}Fa(e){if(!this.options.includeMetadataChanges){let r=[];for(let s of e.docChanges)s.type!==3&&r.push(s);e=new En(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults);}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t;}onError(e){this.xa.error(e);}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t;}La(e,t){if(!e.fromCache||!this.Da())return!0;let r=t!=="Offline";return(!this.options.qa||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline");}Ba(e){if(e.docChanges.length>0)return!0;let t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0;}ka(e){e=En.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e);}Da(){return this.options.source!==ma.Cache;}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var xs=class{constructor(e){this.key=e;}},Vs=class{constructor(e){this.key=e;}},ga=class{constructor(e,t){this.query=e,this.Ya=t,this.Za=null,this.hasCachedResults=!1,this.current=!1,this.Xa=W(),this.mutatedKeys=W(),this.eu=oh(e),this.tu=new Ps(this.eu);}get nu(){return this.Ya;}ru(e,t){let r=t?t.iu:new Ds(),s=t?t.tu:this.tu,o=t?t.mutatedKeys:this.mutatedKeys,a=s,c=!1,l=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,h=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(e.inorderTraversal((f,p)=>{let g=s.get(f),T=zs(this.query,p)?p:null,C=!!g&&this.mutatedKeys.has(g.key),A=!!T&&(T.hasLocalMutations||this.mutatedKeys.has(T.key)&&T.hasCommittedMutations),R=!1;g&&T?g.data.isEqual(T.data)?C!==A&&(r.track({type:3,doc:T}),R=!0):this.su(g,T)||(r.track({type:2,doc:T}),R=!0,(l&&this.eu(T,l)>0||h&&this.eu(T,h)<0)&&(c=!0)):!g&&T?(r.track({type:0,doc:T}),R=!0):g&&!T&&(r.track({type:1,doc:g}),R=!0,(l||h)&&(c=!0)),R&&(T?(a=a.add(T),o=A?o.add(f):o.delete(f)):(a=a.delete(f),o=o.delete(f)));}),this.query.limit!==null)for(;a.size>this.query.limit;){let f=this.query.limitType==="F"?a.last():a.first();a=a.delete(f.key),o=o.delete(f.key),r.track({type:1,doc:f});}return{tu:a,iu:r,Cs:c,mutatedKeys:o};}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations;}applyChanges(e,t,r,s){let o=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;let a=e.iu.ya();a.sort((f,p)=>function(T,C){let A=R=>{switch(R){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return K(20277,{Rt:R});}};return A(T)-A(C);}(f.type,p.type)||this.eu(f.doc,p.doc)),this.ou(r),s=s!==null&&s!==void 0?s:!1;let c=t&&!s?this._u():[],l=this.Xa.size===0&&this.current&&!s?1:0,h=l!==this.Za;return this.Za=l,a.length!==0||h?{snapshot:new En(this.query,e.tu,o,a,e.mutatedKeys,l===0,h,!1,!!r&&r.resumeToken.approximateByteSize()>0),au:c}:{au:c};}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new Ds(),mutatedKeys:this.mutatedKeys,Cs:!1},!1)):{au:[]};}uu(e){return!this.Ya.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations;}ou(e){e&&(e.addedDocuments.forEach(t=>this.Ya=this.Ya.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Ya=this.Ya.delete(t)),this.current=e.current);}_u(){if(!this.current)return[];let e=this.Xa;this.Xa=W(),this.tu.forEach(r=>{this.uu(r.key)&&(this.Xa=this.Xa.add(r.key));});let t=[];return e.forEach(r=>{this.Xa.has(r)||t.push(new Vs(r));}),this.Xa.forEach(r=>{e.has(r)||t.push(new xs(r));}),t;}cu(e){this.Ya=e.Qs,this.Xa=W();let t=this.ru(e.documents);return this.applyChanges(t,!0);}lu(){return En.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Za===0,this.hasCachedResults);}},Za="SyncEngine",pa=class{constructor(e,t,r){this.query=e,this.targetId=t,this.view=r;}},ya=class{constructor(e){this.key=e,this.hu=!1;}},wa=class{constructor(e,t,r,s,o,a){this.localStore=e,this.remoteStore=t,this.eventManager=r,this.sharedClientState=s,this.currentUser=o,this.maxConcurrentLimboResolutions=a,this.Pu={},this.Tu=new lt(c=>ih(c),Gs),this.Iu=new Map(),this.Eu=new Set(),this.du=new ue(j.comparator),this.Au=new Map(),this.Ru=new wr(),this.Vu={},this.mu=new Map(),this.fu=yr.cr(),this.onlineState="Unknown",this.gu=void 0;}get isPrimaryClient(){return this.gu===!0;}};async function xg(n,e,t=!0){let r=Kh(n),s,o=r.Tu.get(e);return o?(r.sharedClientState.addLocalQueryTarget(o.targetId),s=o.view.lu()):s=await Lh(r,e,t,!0),s;}async function Vg(n,e){let t=Kh(n);await Lh(t,e,!0,!1);}async function Lh(n,e,t,r){let s=await gg(n.localStore,He(e)),o=s.targetId,a=n.sharedClientState.addLocalQueryTarget(o,t),c;return r&&(c=await Ng(n,e,o,a==="current",s.resumeToken)),n.isPrimaryClient&&t&&Dh(n.remoteStore,s),c;}async function Ng(n,e,t,r,s){n.pu=(p,g,T)=>async function(A,R,V,k){let F=R.view.ru(V);F.Cs&&(F=await ml(A.localStore,R.query,!1).then(({documents:I})=>R.view.ru(I,F)));let Y=k&&k.targetChanges.get(R.targetId),z=k&&k.targetMismatches.get(R.targetId)!=null,ne=R.view.applyChanges(F,A.isPrimaryClient,Y,z);return El(A,R.targetId,ne.au),ne.snapshot;}(n,p,g,T);let o=await ml(n.localStore,e,!0),a=new ga(e,o.Qs),c=a.ru(o.documents),l=gr.createSynthesizedTargetChangeForCurrentChange(t,r&&n.onlineState!=="Offline",s),h=a.applyChanges(c,n.isPrimaryClient,l);El(n,t,h.au);let f=new pa(e,t,a);return n.Tu.set(e,f),n.Iu.has(t)?n.Iu.get(t).push(e):n.Iu.set(t,[e]),h.snapshot;}async function kg(n,e,t){let r=q(n),s=r.Tu.get(e),o=r.Iu.get(s.targetId);if(o.length>1)return r.Iu.set(s.targetId,o.filter(a=>!Gs(a,e))),void r.Tu.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(s.targetId),r.sharedClientState.isActiveQueryTarget(s.targetId)||(await Yo(r.localStore,s.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(s.targetId),t&&$a(r.remoteStore,s.targetId),_a(r,s.targetId);}).catch(Pn))):(_a(r,s.targetId),await Yo(r.localStore,s.targetId,!0));}async function Og(n,e){let t=q(n),r=t.Tu.get(e),s=t.Iu.get(r.targetId);t.isPrimaryClient&&s.length===1&&(t.sharedClientState.removeLocalQueryTarget(r.targetId),$a(t.remoteStore,r.targetId));}async function Lg(n,e,t){let r=zg(n);try{let s=await function(a,c){let l=q(a),h=fe.now(),f=c.reduce((T,C)=>T.add(C.key),W()),p,g;return l.persistence.runTransaction("Locally write mutations","readwrite",T=>{let C=ht(),A=W();return l.Ns.getEntries(T,f).next(R=>{C=R,C.forEach((V,k)=>{k.isValidDocument()||(A=A.add(V));});}).next(()=>l.localDocuments.getOverlayedDocuments(T,C)).next(R=>{p=R;let V=[];for(let k of c){let F=Um(k,p.get(k.key).overlayedDocument);F!=null&&V.push(new Je(k.key,F,Zl(F.value.mapValue),Ve.exists(!0)));}return l.mutationQueue.addMutationBatch(T,h,V,c);}).next(R=>{g=R;let V=R.applyToLocalDocumentSet(p,A);return l.documentOverlayCache.saveOverlays(T,R.batchId,V);});}).then(()=>({batchId:g.batchId,changes:ch(p)}));}(r.localStore,e);r.sharedClientState.addPendingMutation(s.batchId),function(a,c,l){let h=a.Vu[a.currentUser.toKey()];h||(h=new ue(Q)),h=h.insert(c,l),a.Vu[a.currentUser.toKey()]=h;}(r,s.batchId,t),await Cr(r,s.changes),await qs(r.remoteStore);}catch(s){let o=Wa(s,"Failed to persist write");t.reject(o);}}async function Mh(n,e){let t=q(n);try{let r=await dg(t.localStore,e);e.targetChanges.forEach((s,o)=>{let a=t.Au.get(o);a&&(ee(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?a.hu=!0:s.modifiedDocuments.size>0?ee(a.hu,14607):s.removedDocuments.size>0&&(ee(a.hu,42227),a.hu=!1));}),await Cr(t,r,e);}catch(r){await Pn(r);}}function vl(n,e,t){let r=q(n);if(r.isPrimaryClient&&t===0||!r.isPrimaryClient&&t===1){let s=[];r.Tu.forEach((o,a)=>{let c=a.view.va(e);c.snapshot&&s.push(c.snapshot);}),function(a,c){let l=q(a);l.onlineState=c;let h=!1;l.queries.forEach((f,p)=>{for(let g of p.Sa)g.va(c)&&(h=!0);}),h&&Ya(l);}(r.eventManager,e),s.length&&r.Pu.H_(s),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e);}}async function Mg(n,e,t){let r=q(n);r.sharedClientState.updateQueryState(e,"rejected",t);let s=r.Au.get(e),o=s&&s.key;if(o){let a=new ue(j.comparator);a=a.insert(o,Oe.newNoDocument(o,$.min()));let c=W().add(o),l=new ps($.min(),new Map(),new ue(Q),a,c);await Mh(r,l),r.du=r.du.remove(o),r.Au.delete(e),ec(r);}else await Yo(r.localStore,e,!1).then(()=>_a(r,e,t)).catch(Pn);}async function Fg(n,e){let t=q(n),r=e.batch.batchId;try{let s=await hg(t.localStore,e);Bh(t,r,null),Fh(t,r),t.sharedClientState.updateMutationState(r,"acknowledged"),await Cr(t,s);}catch(s){await Pn(s);}}async function Bg(n,e,t){let r=q(n);try{let s=await function(a,c){let l=q(a);return l.persistence.runTransaction("Reject batch","readwrite-primary",h=>{let f;return l.mutationQueue.lookupMutationBatch(h,c).next(p=>(ee(p!==null,37113),f=p.keys(),l.mutationQueue.removeMutationBatch(h,p))).next(()=>l.mutationQueue.performConsistencyCheck(h)).next(()=>l.documentOverlayCache.removeOverlaysForBatchId(h,f,c)).next(()=>l.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(h,f)).next(()=>l.localDocuments.getDocuments(h,f));});}(r.localStore,e);Bh(r,e,t),Fh(r,e),r.sharedClientState.updateMutationState(e,"rejected",t),await Cr(r,s);}catch(s){await Pn(s);}}function Fh(n,e){(n.mu.get(e)||[]).forEach(t=>{t.resolve();}),n.mu.delete(e);}function Bh(n,e,t){let r=q(n),s=r.Vu[r.currentUser.toKey()];if(s){let o=s.get(e);o&&(t?o.reject(t):o.resolve(),s=s.remove(e)),r.Vu[r.currentUser.toKey()]=s;}}function _a(n,e,t=null){n.sharedClientState.removeLocalQueryTarget(e);for(let r of n.Iu.get(e))n.Tu.delete(r),t&&n.Pu.yu(r,t);n.Iu.delete(e),n.isPrimaryClient&&n.Ru.jr(e).forEach(r=>{n.Ru.containsKey(r)||Uh(n,r);});}function Uh(n,e){n.Eu.delete(e.path.canonicalString());let t=n.du.get(e);t!==null&&($a(n.remoteStore,t),n.du=n.du.remove(e),n.Au.delete(t),ec(n));}function El(n,e,t){for(let r of t)r instanceof xs?(n.Ru.addReference(r.key,e),Ug(n,r)):r instanceof Vs?(U(Za,"Document no longer in limbo: "+r.key),n.Ru.removeReference(r.key,e),n.Ru.containsKey(r.key)||Uh(n,r.key)):K(19791,{wu:r});}function Ug(n,e){let t=e.key,r=t.path.canonicalString();n.du.get(t)||n.Eu.has(r)||(U(Za,"New document in limbo: "+t),n.Eu.add(r),ec(n));}function ec(n){for(;n.Eu.size>0&&n.du.size<n.maxConcurrentLimboResolutions;){let e=n.Eu.values().next().value;n.Eu.delete(e);let t=new j(ie.fromString(e)),r=n.fu.next();n.Au.set(r,new ya(t)),n.du=n.du.insert(t,r),Dh(n.remoteStore,new pr(He(Ks(t.path)),r,"TargetPurposeLimboResolution",ln.ce));}}async function Cr(n,e,t){let r=q(n),s=[],o=[],a=[];r.Tu.isEmpty()||(r.Tu.forEach((c,l)=>{a.push(r.pu(l,e,t).then(h=>{if((h||t)&&r.isPrimaryClient){var _t$targetChanges$get;let f=h?!h.fromCache:t===null||t===void 0||(_t$targetChanges$get=t.targetChanges.get(l.targetId))===null||_t$targetChanges$get===void 0?void 0:_t$targetChanges$get.current;r.sharedClientState.updateQueryState(l.targetId,f?"current":"not-current");}if(h){s.push(h);let f=Qo.As(l.targetId,h);o.push(f);}}));}),await Promise.all(a),r.Pu.H_(s),await async function(l,h){let f=q(l);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>N.forEach(h,g=>N.forEach(g.Es,T=>f.persistence.referenceDelegate.addReference(p,g.targetId,T)).next(()=>N.forEach(g.ds,T=>f.persistence.referenceDelegate.removeReference(p,g.targetId,T)))));}catch(p){if(!Dn(p))throw p;U(ja,"Failed to update sequence numbers: "+p);}for(let p of h){let g=p.targetId;if(!p.fromCache){let T=f.Ms.get(g),C=T.snapshotVersion,A=T.withLastLimboFreeSnapshotVersion(C);f.Ms=f.Ms.insert(g,A);}}}(r.localStore,o));}async function Kg(n,e){let t=q(n);if(!t.currentUser.isEqual(e)){U(Za,"User change. New user:",e.toKey());let r=await Rh(t.localStore,e);t.currentUser=e,function(o,a){o.mu.forEach(c=>{c.forEach(l=>{l.reject(new B(x.CANCELLED,a));});}),o.mu.clear();}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await Cr(t,r.Ls);}}function Gg(n,e){let t=q(n),r=t.Au.get(e);if(r&&r.hu)return W().add(r.key);{let s=W(),o=t.Iu.get(e);if(!o)return s;for(let a of o){let c=t.Tu.get(a);s=s.unionWith(c.view.nu);}return s;}}function Kh(n){let e=q(n);return e.remoteStore.remoteSyncer.applyRemoteEvent=Mh.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=Gg.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=Mg.bind(null,e),e.Pu.H_=Pg.bind(null,e.eventManager),e.Pu.yu=Dg.bind(null,e.eventManager),e;}function zg(n){let e=q(n);return e.remoteStore.remoteSyncer.applySuccessfulWrite=Fg.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=Bg.bind(null,e),e;}var bn=class{constructor(){this.kind="memory",this.synchronizeTabs=!1;}async initialize(e){this.serializer=js(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore);}Fu(e,t){return null;}Mu(e,t){return null;}vu(e){return lg(this.persistence,new Jo(),e.initialUser,this.serializer);}Cu(e){return new Ts(Ho.mi,this.serializer);}Du(e){return new Zo();}async terminate(){var _this$gcScheduler,_this$indexBackfiller;(_this$gcScheduler=this.gcScheduler)!==null&&_this$gcScheduler!==void 0&&_this$gcScheduler.stop(),(_this$indexBackfiller=this.indexBackfillerScheduler)!==null&&_this$indexBackfiller!==void 0&&_this$indexBackfiller.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown();}};bn.provider={build:()=>new bn()};var va=class extends bn{constructor(e){super(),this.cacheSizeBytes=e;}Fu(e,t){ee(this.persistence.referenceDelegate instanceof Is,46915);let r=this.persistence.referenceDelegate.garbageCollector;return new ko(r,e.asyncQueue,t);}Cu(e){let t=this.cacheSizeBytes!==void 0?Le.withCacheSize(this.cacheSizeBytes):Le.DEFAULT;return new Ts(r=>Is.mi(r,t),this.serializer);}};var Er=class{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>vl(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=Kg.bind(null,this.syncEngine),await Rg(this.remoteStore,this.syncEngine.isPrimaryClient));}createEventManager(e){return function(){return new fa();}();}createDatastore(e){let t=js(e.databaseInfo.databaseId),r=function(o){return new sa(o);}(e.databaseInfo);return function(o,a,c,l){return new ca(o,a,c,l);}(e.authCredentials,e.appCheckCredentials,r,t);}createRemoteStore(e){return function(r,s,o,a,c){return new la(r,s,o,a,c);}(this.localStore,this.datastore,e.asyncQueue,t=>vl(this.syncEngine,t,0),function(){return As.v()?new As():new ea();}());}createSyncEngine(e,t){return function(s,o,a,c,l,h,f){let p=new wa(s,o,a,c,l,h);return f&&(p.gu=!0),p;}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t);}async terminate(){var _this$datastore,_this$eventManager;await async function(t){let r=q(t);U(jt,"RemoteStore shutting down."),r.Ea.add(5),await Ar(r),r.Aa.shutdown(),r.Ra.set("Unknown");}(this.remoteStore),(_this$datastore=this.datastore)!==null&&_this$datastore!==void 0&&_this$datastore.terminate(),(_this$eventManager=this.eventManager)===null||_this$eventManager===void 0?void 0:_this$eventManager.terminate();}};Er.provider={build:()=>new Er()};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var br=class{constructor(e){this.observer=e,this.muted=!1;}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e);}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):at("Uncaught Error in snapshot listener:",e.toString()));}Nu(){this.muted=!0;}Ou(e,t){setTimeout(()=>{this.muted||e(t);},0);}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ea=class{constructor(e){this.datastore=e,this.readVersions=new Map(),this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set();}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new B(x.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;let t=await async function(s,o){let a=q(s),c={documents:o.map(p=>Es(a.serializer,p))},l=await a.Ho("BatchGetDocuments",a.serializer.databaseId,ie.emptyPath(),c,o.length),h=new Map();l.forEach(p=>{let g=Wm(a.serializer,p);h.set(g.key.toString(),g);});let f=[];return o.forEach(p=>{let g=h.get(p.toString());ee(!!g,55234,{key:p}),f.push(g);}),f;}(this.datastore,e);return t.forEach(r=>this.recordVersion(r)),t;}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString());}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)));}catch(r){this.lastTransactionError=r;}this.writtenDocs.add(e.toString());}delete(e){this.write(new vn(e,this.precondition(e))),this.writtenDocs.add(e.toString());}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;let e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString());}),e.forEach((t,r)=>{let s=j.fromPath(r);this.mutations.push(new gs(s,this.precondition(s)));}),await async function(r,s){let o=q(r),a={writes:s.map(c=>Th(o.serializer,c))};await o.Go("Commit",o.serializer.databaseId,ie.emptyPath(),a);}(this.datastore,this.mutations),this.committed=!0;}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw K(50498,{Gu:e.constructor.name});t=$.min();}let r=this.readVersions.get(e.key.toString());if(r){if(!t.isEqual(r))throw new B(x.ABORTED,"Document version changed between two reads.");}else this.readVersions.set(e.key.toString(),t);}precondition(e){let t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual($.min())?Ve.exists(!1):Ve.updateTime(t):Ve.none();}preconditionForUpdate(e){let t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual($.min()))throw new B(x.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return Ve.updateTime(t);}return Ve.exists(!0);}write(e){this.ensureCommitNotCalled(),this.mutations.push(e);}ensureCommitNotCalled(){}};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ba=class{constructor(e,t,r,s,o){this.asyncQueue=e,this.datastore=t,this.options=r,this.updateFunction=s,this.deferred=o,this.zu=r.maxAttempts,this.M_=new _r(this.asyncQueue,"transaction_retry");}ju(){this.zu-=1,this.Ju();}Ju(){this.M_.p_(async()=>{let e=new Ea(this.datastore),t=this.Hu(e);t&&t.then(r=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(r);}).catch(s=>{this.Yu(s);}));}).catch(r=>{this.Yu(r);});});}Hu(e){try{let t=this.updateFunction(e);return!Sr(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null);}catch(t){return this.deferred.reject(t),null;}}Yu(e){this.zu>0&&this.Zu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Ju(),Promise.resolve()))):this.deferred.reject(e);}Zu(e){if(e.name==="FirebaseError"){let t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!yh(t);}return!1;}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var At="FirestoreClient",Ta=class{constructor(e,t,r,s,o){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=r,this.databaseInfo=s,this.user=pe.UNAUTHENTICATED,this.clientId=lr.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=o,this.authCredentials.start(r,async a=>{U(At,"Received user=",a.uid),await this.authCredentialListener(a),this.user=a;}),this.appCheckCredentials.start(r,a=>(U(At,"Received new app check token=",a),this.appCheckCredentialListener(a,this.user)));}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100};}setCredentialChangeListener(e){this.authCredentialListener=e;}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e;}terminate(){this.asyncQueue.enterRestrictedMode();let e=new Fe();return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&(await this._onlineComponents.terminate()),this._offlineComponents&&(await this._offlineComponents.terminate()),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve();}catch(t){let r=Wa(t,"Failed to shutdown persistence");e.reject(r);}}),e.promise;}};async function Hi(n,e){n.asyncQueue.verifyOperationInProgress(),U(At,"Initializing OfflineComponentProvider");let t=n.configuration;await e.initialize(t);let r=t.initialUser;n.setCredentialChangeListener(async s=>{r.isEqual(s)||(await Rh(e.localStore,s),r=s);}),e.persistence.setDatabaseDeletedListener(()=>n.terminate()),n._offlineComponents=e;}async function bl(n,e){n.asyncQueue.verifyOperationInProgress();let t=await jg(n);U(At,"Initializing OnlineComponentProvider"),await e.initialize(t,n.configuration),n.setCredentialChangeListener(r=>yl(e.remoteStore,r)),n.setAppCheckTokenChangeListener((r,s)=>yl(e.remoteStore,s)),n._onlineComponents=e;}async function jg(n){if(!n._offlineComponents)if(n._uninitializedComponentsProvider){U(At,"Using user provided OfflineComponentProvider");try{await Hi(n,n._uninitializedComponentsProvider._offline);}catch(e){let t=e;if(!function(s){return s.name==="FirebaseError"?s.code===x.FAILED_PRECONDITION||s.code===x.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11;}(t))throw t;cn("Error using user provided cache. Falling back to memory cache: "+t),await Hi(n,new bn());}}else U(At,"Using default OfflineComponentProvider"),await Hi(n,new va(void 0));return n._offlineComponents;}async function tc(n){return n._onlineComponents||(n._uninitializedComponentsProvider?(U(At,"Using user provided OnlineComponentProvider"),await bl(n,n._uninitializedComponentsProvider._online)):(U(At,"Using default OnlineComponentProvider"),await bl(n,new Er()))),n._onlineComponents;}function $g(n){return tc(n).then(e=>e.syncEngine);}function qg(n){return tc(n).then(e=>e.datastore);}async function Ns(n){let e=await tc(n),t=e.eventManager;return t.onListen=xg.bind(null,e.syncEngine),t.onUnlisten=kg.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=Vg.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=Og.bind(null,e.syncEngine),t;}function Gh(n,e,t={}){let r=new Fe();return n.asyncQueue.enqueueAndForget(async()=>function(o,a,c,l,h){let f=new br({next:g=>{f.Nu(),a.enqueueAndForget(()=>Xa(o,p));let T=g.docs.has(c);!T&&g.fromCache?h.reject(new B(x.UNAVAILABLE,"Failed to get document because the client is offline.")):T&&g.fromCache&&l&&l.source==="server"?h.reject(new B(x.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):h.resolve(g);},error:g=>h.reject(g)}),p=new vr(Ks(c.path),f,{includeMetadataChanges:!0,qa:!0});return Ja(o,p);}(await Ns(n),n.asyncQueue,e,t,r)),r.promise;}function Hg(n,e,t={}){let r=new Fe();return n.asyncQueue.enqueueAndForget(async()=>function(o,a,c,l,h){let f=new br({next:g=>{f.Nu(),a.enqueueAndForget(()=>Xa(o,p)),g.fromCache&&l.source==="server"?h.reject(new B(x.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):h.resolve(g);},error:g=>h.reject(g)}),p=new vr(c,f,{includeMetadataChanges:!0,qa:!0});return Ja(o,p);}(await Ns(n),n.asyncQueue,e,t,r)),r.promise;}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zh(n){let e={};return n.timeoutSeconds!==void 0&&(e.timeoutSeconds=n.timeoutSeconds),e;}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Tl=new Map();/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var jh="firestore.googleapis.com",Il=!0,ks=class{constructor(e){var _e$ssl,_e$experimentalLongPo;if(e.host===void 0){if(e.ssl!==void 0)throw new B(x.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=jh,this.ssl=Il;}else this.host=e.host,this.ssl=(_e$ssl=e.ssl)!==null&&_e$ssl!==void 0?_e$ssl:Il;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=Ch;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<ag)throw new B(x.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes;}rm("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=zh((_e$experimentalLongPo=e.experimentalLongPollingOptions)!==null&&_e$experimentalLongPo!==void 0?_e$experimentalLongPo:{}),function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new B(x.INVALID_ARGUMENT,"invalid long polling timeout: ".concat(r.timeoutSeconds," (must not be NaN)"));if(r.timeoutSeconds<5)throw new B(x.INVALID_ARGUMENT,"invalid long polling timeout: ".concat(r.timeoutSeconds," (minimum allowed value is 5)"));if(r.timeoutSeconds>30)throw new B(x.INVALID_ARGUMENT,"invalid long polling timeout: ".concat(r.timeoutSeconds," (maximum allowed value is 30)"));}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams;}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,s){return r.timeoutSeconds===s.timeoutSeconds;}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams;}},Tn=class{constructor(e,t,r,s){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=r,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new ks({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated";}get app(){if(!this._app)throw new B(x.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app;}get _initialized(){return this._settingsFrozen;}get _terminated(){return this._terminateTask!=="notTerminated";}_setSettings(e){if(this._settingsFrozen)throw new B(x.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new ks(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new Qi();switch(r.type){case"firstParty":return new Yi(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new B(x.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type");}}(e.credentials));}_getSettings(){return this._settings;}_getEmulatorOptions(){return this._emulatorOptions;}_freezeSettings(){return this._settingsFrozen=!0,this._settings;}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask;}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated";}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings};}_terminate(){return function(t){let r=Tl.get(t);r&&(U("ComponentProvider","Removing Datastore"),Tl.delete(t),r.terminate());}(this),Promise.resolve();}};function Qg(n,e,t,r={}){n=Pe(n,Tn);let s=Wr(e),o=n._getSettings(),a={...o,emulatorOptions:n._getEmulatorOptions()},c="".concat(e,":").concat(t);s&&(mu("https://".concat(c)),pu("Firestore",!0)),o.host!==jh&&o.host!==c&&cn("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");let l={...o,host:c,ssl:s,emulatorOptions:r};if(!Xt(l,a)&&(n._setSettings(l),r.mockUserToken)){let h,f;if(typeof r.mockUserToken=="string")h=r.mockUserToken,f=pe.MOCK_USER;else{var _n$_app;h=gu(r.mockUserToken,(_n$_app=n._app)===null||_n$_app===void 0?void 0:_n$_app.options.projectId);let p=r.mockUserToken.sub||r.mockUserToken.user_id;if(!p)throw new B(x.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");f=new pe(p);}n._authCredentials=new Wi(new as(h,f));}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Tr=class n{constructor(e,t,r){this.converter=t,this._query=r,this.type="query",this.firestore=e;}withConverter(e){return new n(this.firestore,e,this._query);}},ge=class n{constructor(e,t,r){this.converter=t,this._key=r,this.type="document",this.firestore=e;}get _path(){return this._key.path;}get id(){return this._key.path.lastSegment();}get path(){return this._key.path.canonicalString();}get parent(){return new vt(this.firestore,this.converter,this._key.path.popLast());}withConverter(e){return new n(this.firestore,e,this._key);}toJSON(){return{type:n._jsonSchemaVersion,referencePath:this._key.toString()};}static fromJSON(e,t,r){if(Ir(t,n._jsonSchema))return new n(e,r||null,new j(ie.fromString(t.referencePath)));}};ge._jsonSchemaVersion="firestore/documentReference/1.0",ge._jsonSchema={type:de("string",ge._jsonSchemaVersion),referencePath:de("string")};var vt=class n extends Tr{constructor(e,t,r){super(e,t,Ks(r)),this._path=r,this.type="collection";}get id(){return this._query.path.lastSegment();}get path(){return this._query.path.canonicalString();}get parent(){let e=this._path.popLast();return e.isEmpty()?null:new ge(this.firestore,null,new j(e));}withConverter(e){return new n(this.firestore,e,this._path);}};function Xe(n,e,...t){if(n=Ge(n),Pl("collection","path",e),n instanceof Tn){let r=ie.fromString(e,...t);return ju(r),new vt(n,null,r);}{if(!(n instanceof ge||n instanceof vt))throw new B(x.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");let r=n._path.child(ie.fromString(e,...t));return ju(r),new vt(n.firestore,null,r);}}function O(n,e,...t){if(n=Ge(n),arguments.length===1&&(e=lr.newId()),Pl("doc","path",e),n instanceof Tn){let r=ie.fromString(e,...t);return zu(r),new ge(n,null,new j(r));}{if(!(n instanceof ge||n instanceof vt))throw new B(x.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");let r=n._path.child(ie.fromString(e,...t));return zu(r),new ge(n.firestore,n instanceof vt?n.converter:null,new j(r));}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Sl="AsyncQueue",Os=class{constructor(e=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new _r(this,"async_queue_retry"),this._c=()=>{let r=qi();r&&U(Sl,"Visibility state changed to "+r.visibilityState),this.M_.w_();},this.ac=e;let t=qi();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c);}get isShuttingDown(){return this.ec;}enqueueAndForget(e){this.enqueue(e);}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e);}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;let t=qi();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c);}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});let t=new Fe();return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise);}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Xu.push(e),this.lc()));}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset();}catch(e){if(!Dn(e))throw e;U(Sl,"Operation failed with retryable error: "+e);}this.Xu.length>0&&this.M_.p_(()=>this.lc());}}cc(e){let t=this.ac.then(()=>(this.rc=!0,e().catch(r=>{throw this.nc=r,this.rc=!1,at("INTERNAL UNHANDLED ERROR: ",Al(r)),r;}).then(r=>(this.rc=!1,r))));return this.ac=t,t;}enqueueAfterDelay(e,t,r){this.uc(),this.oc.indexOf(e)>-1&&(t=0);let s=ha.createAndSchedule(this,e,t,r,o=>this.hc(o));return this.tc.push(s),s;}uc(){this.nc&&K(47125,{Pc:Al(this.nc)});}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac);}Ic(e){for(let t of this.tc)if(t.timerId===e)return!0;return!1;}Ec(e){return this.Tc().then(()=>{this.tc.sort((t,r)=>t.targetTimeMs-r.targetTimeMs);for(let t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc();});}dc(e){this.oc.push(e);}hc(e){let t=this.tc.indexOf(e);this.tc.splice(t,1);}};function Al(n){let e=n.message||"";return n.stack&&(e=n.stack.includes(n.message)?n.stack:n.message+"\n"+n.stack),e;}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cl(n){return function(t,r){if(typeof t!="object"||t===null)return!1;let s=t;for(let o of r)if(o in s&&typeof s[o]=="function")return!0;return!1;}(n,["next","error","complete"]);}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ze=class extends Tn{constructor(e,t,r,s){super(e,t,r,s),this.type="firestore",this._queue=new Os(),this._persistenceKey=(s===null||s===void 0?void 0:s.name)||"[DEFAULT]";}async _terminate(){if(this._firestoreClient){let e=this._firestoreClient.terminate();this._queue=new Os(e),this._firestoreClient=void 0,await e;}}};function $h(n,e){let t=typeof n=="object"?n:Ou(),r=typeof n=="string"?n:e||ds,s=Vu(t,"firestore").getImmediate({identifier:r});if(!s._initialized){let o=fu("firestore");o&&Qg(s,...o);}return s;}function Vn(n){if(n._terminated)throw new B(x.FAILED_PRECONDITION,"The client has already been terminated.");return n._firestoreClient||Wg(n),n._firestoreClient;}function Wg(n){var _n$_app2,_e$localCache,_e$localCache2;let e=n._freezeSettings(),t=function(s,o,a,c){return new ro(s,o,a,c.host,c.ssl,c.experimentalForceLongPolling,c.experimentalAutoDetectLongPolling,zh(c.experimentalLongPollingOptions),c.useFetchStreams,c.isUsingEmulator);}(n._databaseId,((_n$_app2=n._app)===null||_n$_app2===void 0?void 0:_n$_app2.options.appId)||"",n._persistenceKey,e);n._componentsProvider||(_e$localCache=e.localCache)!==null&&_e$localCache!==void 0&&_e$localCache._offlineComponentProvider&&(_e$localCache2=e.localCache)!==null&&_e$localCache2!==void 0&&_e$localCache2._onlineComponentProvider&&(n._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),n._firestoreClient=new Ta(n._authCredentials,n._appCheckCredentials,n._queue,t,n._componentsProvider&&function(s){let o=s===null||s===void 0?void 0:s._online.build();return{_offline:s===null||s===void 0?void 0:s._offline.build(o),_online:o};}(n._componentsProvider));}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ot=class n{constructor(e){this._byteString=e;}static fromBase64String(e){try{return new n(Se.fromBase64String(e));}catch(t){throw new B(x.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t);}}static fromUint8Array(e){return new n(Se.fromUint8Array(e));}toBase64(){return this._byteString.toBase64();}toUint8Array(){return this._byteString.toUint8Array();}toString(){return"Bytes(base64: "+this.toBase64()+")";}isEqual(e){return this._byteString.isEqual(e._byteString);}toJSON(){return{type:n._jsonSchemaVersion,bytes:this.toBase64()};}static fromJSON(e){if(Ir(e,n._jsonSchema))return n.fromBase64String(e.bytes);}};ot._jsonSchemaVersion="firestore/bytes/1.0",ot._jsonSchema={type:de("string",ot._jsonSchemaVersion),bytes:de("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var In=class{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new B(x.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new Ne(e);}isEqual(e){return this._internalPath.isEqual(e._internalPath);}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Sn=class{constructor(e){this._methodName=e;}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Et=class n{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new B(x.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new B(x.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t;}get latitude(){return this._lat;}get longitude(){return this._long;}isEqual(e){return this._lat===e._lat&&this._long===e._long;}_compareTo(e){return Q(this._lat,e._lat)||Q(this._long,e._long);}toJSON(){return{latitude:this._lat,longitude:this._long,type:n._jsonSchemaVersion};}static fromJSON(e){if(Ir(e,n._jsonSchema))return new n(e.latitude,e.longitude);}};Et._jsonSchemaVersion="firestore/geoPoint/1.0",Et._jsonSchema={type:de("string",Et._jsonSchemaVersion),latitude:de("number"),longitude:de("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var bt=class n{constructor(e){this._values=(e||[]).map(t=>t);}toArray(){return this._values.map(e=>e);}isEqual(e){return function(r,s){if(r.length!==s.length)return!1;for(let o=0;o<r.length;++o)if(r[o]!==s[o])return!1;return!0;}(this._values,e._values);}toJSON(){return{type:n._jsonSchemaVersion,vectorValues:this._values};}static fromJSON(e){if(Ir(e,n._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new n(e.vectorValues);throw new B(x.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array");}}};bt._jsonSchemaVersion="firestore/vectorValue/1.0",bt._jsonSchema={type:de("string",bt._jsonSchemaVersion),vectorValues:de("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Jg=/^__.*__$/,Ia=class{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r;}toMutation(e,t){return this.fieldMask!==null?new Je(e,this.data,this.fieldMask,t,this.fieldTransforms):new zt(e,this.data,t,this.fieldTransforms);}},Ls=class{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r;}toMutation(e,t){return new Je(e,this.data,this.fieldMask,t,this.fieldTransforms);}};function qh(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw K(40011,{Ac:n});}}var Sa=class n{constructor(e,t,r,s,o,a){this.settings=e,this.databaseId=t,this.serializer=r,this.ignoreUndefinedProperties=s,o===void 0&&this.Rc(),this.fieldTransforms=o||[],this.fieldMask=a||[];}get path(){return this.settings.path;}get Ac(){return this.settings.Ac;}Vc(e){return new n({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask);}mc(e){var _this$path;let t=(_this$path=this.path)===null||_this$path===void 0?void 0:_this$path.child(e),r=this.Vc({path:t,fc:!1});return r.gc(e),r;}yc(e){var _this$path2;let t=(_this$path2=this.path)===null||_this$path2===void 0?void 0:_this$path2.child(e),r=this.Vc({path:t,fc:!1});return r.Rc(),r;}wc(e){return this.Vc({path:void 0,fc:!0});}Sc(e){return Fs(e,this.settings.methodName,this.settings.bc||!1,this.path,this.settings.Dc);}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0;}Rc(){if(this.path)for(let e=0;e<this.path.length;e++)this.gc(this.path.get(e));}gc(e){if(e.length===0)throw this.Sc("Document fields must not be empty");if(qh(this.Ac)&&Jg.test(e))throw this.Sc('Document fields cannot begin and end with "__"');}},Aa=class{constructor(e,t,r){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=r||js(e);}Cc(e,t,r,s=!1){return new Sa({Ac:e,methodName:t,Dc:r,path:Ne.emptyPath(),fc:!1,bc:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties);}};function Hh(n){let e=n._freezeSettings(),t=js(n._databaseId);return new Aa(n._databaseId,!!e.ignoreUndefinedProperties,t);}function Qh(n,e,t,r,s,o={}){let a=n.Cc(o.merge||o.mergeFields?2:0,e,t,s);nc("Data must be an object, but it was:",a,r);let c=Wh(r,a),l,h;if(o.merge)l=new Me(a.fieldMask),h=a.fieldTransforms;else if(o.mergeFields){let f=[];for(let p of o.mergeFields){let g=Ra(e,p,t);if(!a.contains(g))throw new B(x.INVALID_ARGUMENT,"Field '".concat(g,"' is specified in your field mask but missing from your input data."));Xh(f,g)||f.push(g);}l=new Me(f),h=a.fieldTransforms.filter(p=>l.covers(p.field));}else l=null,h=a.fieldTransforms;return new Ia(new Re(c),l,h);}var Ms=class n extends Sn{_toFieldTransform(e){if(e.Ac!==2)throw e.Ac===1?e.Sc("".concat(this._methodName,"() can only appear at the top level of your update data")):e.Sc("".concat(this._methodName,"() cannot be used with set() unless you pass {merge:true}"));return e.fieldMask.push(e.path),null;}isEqual(e){return e instanceof n;}};var Ca=class n extends Sn{_toFieldTransform(e){return new wo(e.path,new Ut());}isEqual(e){return e instanceof n;}};function Xg(n,e,t,r){let s=n.Cc(1,e,t);nc("Data must be an object, but it was:",s,r);let o=[],a=Re.empty();Ct(r,(l,h)=>{let f=rc(e,l,t);h=Ge(h);let p=s.yc(f);if(h instanceof Ms)o.push(f);else{let g=Hs(h,p);g!=null&&(o.push(f),a.set(f,g));}});let c=new Me(o);return new Ls(a,c,s.fieldTransforms);}function Yg(n,e,t,r,s,o){let a=n.Cc(1,e,t),c=[Ra(e,r,t)],l=[s];if(o.length%2!=0)throw new B(x.INVALID_ARGUMENT,"Function ".concat(e,"() needs to be called with an even number of arguments that alternate between field names and values."));for(let g=0;g<o.length;g+=2)c.push(Ra(e,o[g])),l.push(o[g+1]);let h=[],f=Re.empty();for(let g=c.length-1;g>=0;--g)if(!Xh(h,c[g])){let T=c[g],C=l[g];C=Ge(C);let A=a.yc(T);if(C instanceof Ms)h.push(T);else{let R=Hs(C,A);R!=null&&(h.push(T),f.set(T,R));}}let p=new Me(h);return new Ls(f,p,a.fieldTransforms);}function Hs(n,e){if(Jh(n=Ge(n)))return nc("Unsupported field value:",e,n),Wh(n,e);if(n instanceof Sn)return function(r,s){if(!qh(s.Ac))throw s.Sc("".concat(r._methodName,"() can only be used with update() and set()"));if(!s.path)throw s.Sc("".concat(r._methodName,"() is not currently supported inside arrays"));let o=r._toFieldTransform(s);o&&s.fieldTransforms.push(o);}(n,e),null;if(n===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),n instanceof Array){if(e.settings.fc&&e.Ac!==4)throw e.Sc("Nested arrays are not supported");return function(r,s){let o=[],a=0;for(let c of r){let l=Hs(c,s.wc(a));l==null&&(l={nullValue:"NULL_VALUE"}),o.push(l),a++;}return{arrayValue:{values:o}};}(n,e);}return function(r,s){if((r=Ge(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return Om(s.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){let o=fe.fromDate(r);return{timestampValue:vs(s.serializer,o)};}if(r instanceof fe){let o=new fe(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:vs(s.serializer,o)};}if(r instanceof Et)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof ot)return{bytesValue:_h(s.serializer,r._byteString)};if(r instanceof ge){let o=s.databaseId,a=r.firestore._databaseId;if(!a.isEqual(o))throw s.Sc("Document reference is for database ".concat(a.projectId,"/").concat(a.database," but should be for database ").concat(o.projectId,"/").concat(o.database));return{referenceValue:za(r.firestore._databaseId||s.databaseId,r._key.path)};}if(r instanceof bt)return function(a,c){return{mapValue:{fields:{[Ma]:{stringValue:Fa},[hn]:{arrayValue:{values:a.toArray().map(h=>{if(typeof h!="number")throw c.Sc("VectorValues must only contain numeric values.");return Ga(c.serializer,h);})}}}}};}(r,s);throw s.Sc("Unsupported field value: ".concat(ka(r)));}(n,e);}function Wh(n,e){let t={};return $l(n)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Ct(n,(r,s)=>{let o=Hs(s,e.mc(r));o!=null&&(t[r]=o);}),{mapValue:{fields:t}};}function Jh(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof fe||n instanceof Et||n instanceof ot||n instanceof ge||n instanceof Sn||n instanceof bt);}function nc(n,e,t){if(!Jh(t)||!Dl(t)){let r=ka(t);throw r==="an object"?e.Sc(n+" a custom object"):e.Sc(n+" "+r);}}function Ra(n,e,t){if((e=Ge(e))instanceof In)return e._internalPath;if(typeof e=="string")return rc(n,e);throw Fs("Field path arguments must be of type string or ",n,!1,void 0,t);}var Zg=new RegExp("[~\\*/\\[\\]]");function rc(n,e,t){if(e.search(Zg)>=0)throw Fs("Invalid field path (".concat(e,"). Paths must not contain '~', '*', '/', '[', or ']'"),n,!1,void 0,t);try{return new In(...e.split("."))._internalPath;}catch(_unused25){throw Fs("Invalid field path (".concat(e,"). Paths must not be empty, begin with '.', end with '.', or contain '..'"),n,!1,void 0,t);}}function Fs(n,e,t,r,s){let o=r&&!r.isEmpty(),a=s!==void 0,c="Function ".concat(e,"() called with invalid data");t&&(c+=" (via `toFirestore()`)"),c+=". ";let l="";return(o||a)&&(l+=" (found",o&&(l+=" in field ".concat(r)),a&&(l+=" in document ".concat(s)),l+=")"),new B(x.INVALID_ARGUMENT,c+n+l);}function Xh(n,e){return n.some(t=>t.isEqual(e));}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var An=class{constructor(e,t,r,s,o){this._firestore=e,this._userDataWriter=t,this._key=r,this._document=s,this._converter=o;}get id(){return this._key.path.lastSegment();}get ref(){return new ge(this._firestore,this._converter,this._key);}exists(){return this._document!==null;}data(){if(this._document){if(this._converter){let e=new Pa(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e);}return this._userDataWriter.convertValue(this._document.data.value);}}get(e){if(this._document){let t=this._document.data.field(Yh("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t);}}},Pa=class extends An{data(){return super.data();}};function Yh(n,e){return typeof e=="string"?rc(n,e):e instanceof In?e._internalPath:e._delegate._internalPath;}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zh(n){if(n.limitType==="L"&&n.explicitOrderBy.length===0)throw new B(x.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause");}var Bs=class{convertValue(e,t="none"){switch(It(e)){case 0:return null;case 1:return e.booleanValue;case 2:return oe(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(ut(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw K(62114,{value:e});}}convertObject(e,t){return this.convertObjectMap(e.fields,t);}convertObjectMap(e,t="none"){let r={};return Ct(e,(s,o)=>{r[s]=this.convertValue(o,t);}),r;}convertVectorValue(e){var _e$fields;let t=(_e$fields=e.fields)===null||_e$fields===void 0||(_e$fields=_e$fields[hn].arrayValue)===null||_e$fields===void 0||(_e$fields=_e$fields.values)===null||_e$fields===void 0?void 0:_e$fields.map(r=>oe(r.doubleValue));return new bt(t);}convertGeoPoint(e){return new Et(oe(e.latitude),oe(e.longitude));}convertArray(e,t){return(e.values||[]).map(r=>this.convertValue(r,t));}convertServerTimestamp(e,t){switch(t){case"previous":let r=Us(e);return r==null?null:this.convertValue(r,t);case"estimate":return this.convertTimestamp(fr(e));default:return null;}}convertTimestamp(e){let t=ct(e);return new fe(t.seconds,t.nanos);}convertDocumentKey(e,t){let r=ie.fromString(e);ee(Ah(r),9688,{name:e});let s=new fs(r.get(1),r.get(3)),o=new j(r.popFirst(5));return s.isEqual(t)||at("Document ".concat(o," contains a document reference within a different database (").concat(s.projectId,"/").concat(s.database,") which is not supported. It will be treated as a reference in the current database (").concat(t.projectId,"/").concat(t.database,") instead.")),o;}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ed(n,e,t){let r;return r=n?t&&(t.merge||t.mergeFields)?n.toFirestore(e,t):n.toFirestore(e):e,r;}var Da=class extends Bs{constructor(e){super(),this.firestore=e;}convertBytes(e){return new ot(e);}convertReference(e){let t=this.convertDocumentKey(e,this.firestore._databaseId);return new ge(this.firestore,null,t);}};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var _t=class{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t;}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache;}},Tt=class n extends An{constructor(e,t,r,s,o,a){super(e,t,r,s,a),this._firestore=e,this._firestoreImpl=e,this.metadata=o;}exists(){return super.exists();}data(e={}){if(this._document){if(this._converter){let t=new an(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e);}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps);}}get(e,t={}){if(this._document){let r=this._document.data.field(Yh("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,t.serverTimestamps);}}toJSON(){if(this.metadata.hasPendingWrites)throw new B(x.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");let e=this._document,t={};return t.type=n._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t);}};Tt._jsonSchemaVersion="firestore/documentSnapshot/1.0",Tt._jsonSchema={type:de("string",Tt._jsonSchemaVersion),bundleSource:de("string","DocumentSnapshot"),bundleName:de("string"),bundle:de("string")};var an=class extends Tt{data(e={}){return super.data(e);}},Mt=class n{constructor(e,t,r,s){this._firestore=e,this._userDataWriter=t,this._snapshot=s,this.metadata=new _t(s.hasPendingWrites,s.fromCache),this.query=r;}get docs(){let e=[];return this.forEach(t=>e.push(t)),e;}get size(){return this._snapshot.docs.size;}get empty(){return this.size===0;}forEach(e,t){this._snapshot.docs.forEach(r=>{e.call(t,new an(this._firestore,this._userDataWriter,r.key,r,new _t(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter));});}docChanges(e={}){let t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new B(x.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(s,o){if(s._snapshot.oldDocs.isEmpty()){let a=0;return s._snapshot.docChanges.map(c=>{let l=new an(s._firestore,s._userDataWriter,c.doc.key,c.doc,new _t(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);return c.doc,{type:"added",doc:l,oldIndex:-1,newIndex:a++};});}{let a=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(c=>o||c.type!==3).map(c=>{let l=new an(s._firestore,s._userDataWriter,c.doc.key,c.doc,new _t(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter),h=-1,f=-1;return c.type!==0&&(h=a.indexOf(c.doc.key),a=a.delete(c.doc.key)),c.type!==1&&(a=a.add(c.doc),f=a.indexOf(c.doc.key)),{type:ep(c.type),doc:l,oldIndex:h,newIndex:f};});}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges;}toJSON(){if(this.metadata.hasPendingWrites)throw new B(x.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");let e={};e.type=n._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=lr.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;let t=[],r=[],s=[];return this.docs.forEach(o=>{o._document!==null&&(t.push(o._document),r.push(this._userDataWriter.convertObjectMap(o._document.data.value.mapValue.fields,"previous")),s.push(o.ref.path));}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e;}};function ep(n){switch(n){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return K(61501,{type:n});}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nn(n){n=Pe(n,ge);let e=Pe(n.firestore,ze);return Gh(Vn(e),n._key).then(t=>sc(e,n,t));}Mt._jsonSchemaVersion="firestore/querySnapshot/1.0",Mt._jsonSchema={type:de("string",Mt._jsonSchemaVersion),bundleSource:de("string","QuerySnapshot"),bundleName:de("string"),bundle:de("string")};var Cn=class extends Bs{constructor(e){super(),this.firestore=e;}convertBytes(e){return new ot(e);}convertReference(e){let t=this.convertDocumentKey(e,this.firestore._databaseId);return new ge(this.firestore,null,t);}};function Rt(n){n=Pe(n,ge);let e=Pe(n.firestore,ze);return Gh(Vn(e),n._key,{source:"server"}).then(t=>sc(e,n,t));}function Rr(n){n=Pe(n,Tr);let e=Pe(n.firestore,ze),t=Vn(e),r=new Cn(e);return Zh(n._query),Hg(t,n._query).then(s=>new Mt(e,r,n,s));}function qt(n,e,t){n=Pe(n,ge);let r=Pe(n.firestore,ze),s=ed(n.converter,e,t);return td(r,[Qh(Hh(r),"setDoc",n._key,s,n.converter!==null,t).toMutation(n._key,Ve.none())]);}function Pr(n){return td(Pe(n.firestore,ze),[new vn(n._key,Ve.none())]);}function De(n,...e){n=Ge(n);let t={includeMetadataChanges:!1,source:"default"},r=0;typeof e[r]!="object"||Cl(e[r])||(t=e[r++]);let s={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(Cl(e[r])){var _l$next,_l$error,_l$complete;let l=e[r];e[r]=(_l$next=l.next)===null||_l$next===void 0?void 0:_l$next.bind(l),e[r+1]=(_l$error=l.error)===null||_l$error===void 0?void 0:_l$error.bind(l),e[r+2]=(_l$complete=l.complete)===null||_l$complete===void 0?void 0:_l$complete.bind(l);}let o,a,c;if(n instanceof ge)a=Pe(n.firestore,ze),c=Ks(n._key.path),o={next:l=>{e[r]&&e[r](sc(a,n,l));},error:e[r+1],complete:e[r+2]};else{let l=Pe(n,Tr);a=Pe(l.firestore,ze),c=l._query;let h=new Cn(a);o={next:f=>{e[r]&&e[r](new Mt(a,h,l,f));},error:e[r+1],complete:e[r+2]},Zh(n._query);}return function(h,f,p,g){let T=new br(g),C=new vr(f,T,p);return h.asyncQueue.enqueueAndForget(async()=>Ja(await Ns(h),C)),()=>{T.Nu(),h.asyncQueue.enqueueAndForget(async()=>Xa(await Ns(h),C));};}(Vn(a),c,s,o);}function td(n,e){return function(r,s){let o=new Fe();return r.asyncQueue.enqueueAndForget(async()=>Lg(await $g(r),s,o)),o.promise;}(Vn(n),e);}function sc(n,e,t){let r=t.docs.get(e._key),s=new Cn(n);return new Tt(n,s,e._key,r,new _t(t.hasPendingWrites,t.fromCache),e.converter);}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var tp={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sr(n,e){if((n=Ge(n)).firestore!==e)throw new B(x.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return n;}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var xa=class{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=Hh(e);}get(e){let t=sr(e,this._firestore),r=new Da(this._firestore);return this._transaction.lookup([t._key]).then(s=>{if(!s||s.length!==1)return K(24041);let o=s[0];if(o.isFoundDocument())return new An(this._firestore,r,o.key,o,t.converter);if(o.isNoDocument())return new An(this._firestore,r,t._key,null,t.converter);throw K(18433,{doc:o});});}set(e,t,r){let s=sr(e,this._firestore),o=ed(s.converter,t,r),a=Qh(this._dataReader,"Transaction.set",s._key,o,s.converter!==null,r);return this._transaction.set(s._key,a),this;}update(e,t,r,...s){let o=sr(e,this._firestore),a;return a=typeof(t=Ge(t))=="string"||t instanceof In?Yg(this._dataReader,"Transaction.update",o._key,t,r,s):Xg(this._dataReader,"Transaction.update",o._key,t),this._transaction.update(o._key,a),this;}delete(e){let t=sr(e,this._firestore);return this._transaction.delete(t._key),this;}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Va=class extends xa{constructor(e,t){super(e,t),this._firestore=e;}get(e){let t=sr(e,this._firestore),r=new Cn(this._firestore);return super.get(e).then(s=>new Tt(this._firestore,r,t._key,s._document,new _t(!1,!1),t.converter));}};function H(n,e,t){n=Pe(n,ze);let r={...tp,...t};return function(o){if(o.maxAttempts<1)throw new B(x.INVALID_ARGUMENT,"Max attempts must be at least 1");}(r),function(o,a,c){let l=new Fe();return o.asyncQueue.enqueueAndForget(async()=>{let h=await qg(o);new ba(o.asyncQueue,h,c,a,l).ju();}),l.promise;}(Vn(n),s=>e(new Va(n,s)),r);}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function G(){return new Ca("serverTimestamp");}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(function(e,t=!0){(function(s){Rn=s;})(ku),er(new nt("firestore",(r,{instanceIdentifier:s,options:o})=>{let a=r.getProvider("app").getImmediate(),c=new ze(new Ji(r.getProvider("auth-internal")),new Zi(a,r.getProvider("app-check-internal")),function(h,f){if(!Object.prototype.hasOwnProperty.apply(h.options,["projectId"]))throw new B(x.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new fs(h.options.projectId,f);}(a,s),a);return o={useFetchStreams:t,...o},c._setSettings(o),c;},"PUBLIC").setMultipleInstances(!0)),wt(Uu,Ku,e),wt(Uu,Ku,"esm2020");})();var nd={apiKey:"AIzaSyClS5Mby1bZ39Olgra0bEvV273_c5FRTck",authDomain:"kegelclub-invaliden-schwadron.firebaseapp.com",projectId:"kegelclub-invaliden-schwadron",storageBucket:"kegelclub-invaliden-schwadron.firebasestorage.app",messagingSenderId:"1013015505267",appId:"1:1013015505267:web:6cc65bae12a4337cd8fd06",measurementId:"G-F4T56N61BF"},np=Mi(nd),D=$h(np);(_window$KCSharedClock=window.KCSharedClock)===null||_window$KCSharedClock===void 0||_window$KCSharedClock.configure(nd);function Pt(n){if(n===void 0)return null;if(n===null||typeof n=="string"||typeof n=="number"||typeof n=="boolean")return n;if(Array.isArray(n))return n.map(t=>Pt(t));if(n instanceof Date||Object.getPrototypeOf(n)!==Object.prototype)return n;let e={};return Object.entries(n).forEach(([t,r])=>{r===void 0||typeof r=="function"||(e[t]=Pt(r));}),e;}function Qs(n){let e=String(n||"").trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"_").replace(/^_+|_+$/g,"");if(!e)throw new Error("Spielschl\xFCssel fehlt");return e;}function rp(n){if(!n||typeof n!="object")return{};if(n.state&&typeof n.state=="object")return Pt(n.state);let e={...n};return delete e.gameKey,delete e.revision,delete e.updatedClientId,delete e.updatedClientAt,delete e.updatedAt,delete e.createdAt,Pt(e);}function ic(n,e){return e?{gameKey:e.gameKey||Qs(n),state:rp(e),revision:Math.max(0,parseInt(e.revision||0,10)||0),updatedClientId:String(e.updatedClientId||""),updatedClientAt:Number(e.updatedClientAt||0)||0,updatedAt:e.updatedAt||null,createdAt:e.createdAt||null}:null;}var Be=(_window$KCSharedTrans=window.KCSharedTransport)===null||_window$KCSharedTrans===void 0?void 0:_window$KCSharedTrans.create({db:D,doc:O,runTransaction:H,getDocFromServer:Rt,serverTimestamp:G,core:window.KCSharedCore,policy:window.KCGameFinePolicy});async function M(n,e,t,r){return Be?Be.transaction(n,e,r):H(t,r);}async function Ye(n,e,t,r,s){return Be?Be.transaction(n,e,async o=>{await o.get(t),o.set(t,r,s);}):qt(t,r,s);}async function kn(n,e,t){return Be?Be.transaction(n,e,async r=>{await r.get(t),r.delete(t);}):Pr(t);}window.firestoreApi={async sendDashboardSignal(n,e){var _e$description;if(!/^[a-zA-Z0-9_-]{1,80}$/.test(e.viewerId||"")||!/^[a-zA-Z0-9_-]{1,80}$/.test(e.connectionId||"")||!["offer","answer"].includes(e.action)||((_e$description=e.description)===null||_e$description===void 0?void 0:_e$description.type)!==e.action||typeof e.description.sdp!="string"||e.description.sdp.length>6e4)throw Error("Ung\xFCltige TV-Verbindung");let t=O(D,"clubs",n,"state","current"),r=O(D,"clubs",n,"documents","dashboard_link_"+e.viewerId),s="sync_"+crypto.randomUUID();try{return await H(D,async o=>{var _window$KCSharedClock2,_window$KCSharedClock3;let a=await o.get(r),c=a.exists()?a.data():{};if(e.action==="answer"&&c.connectionId!==e.connectionId)return!1;let l=e.action==="offer"?{kind:"dashboardLink",viewerId:e.viewerId,connectionId:e.connectionId,offer:e.description,answer:null,expiresAt:((_window$KCSharedClock2=(_window$KCSharedClock3=window.KCSharedClock)===null||_window$KCSharedClock3===void 0?void 0:_window$KCSharedClock3.now())!==null&&_window$KCSharedClock2!==void 0?_window$KCSharedClock2:Date.now())+12e4}:{kind:"dashboardLink",viewerId:c.viewerId,connectionId:c.connectionId,offer:c.offer,answer:e.description,source:e.source,expiresAt:c.expiresAt};return o.set(r,l),!0;});}catch(o){if(o.code!=="permission-denied")throw o;}for(let o=0;o<2;o++){let a=await Rt(t),c=a.exists()?a.data():{};if(!c.syncProtocol)return!1;let l={method:"dashboardSignal",opId:s,base:c,eveningStartedAt:c.currentEveningStartedAt||"",sideOperations:[]};try{return await Be.transaction(n,l,async h=>{var _window$KCSharedClock4,_window$KCSharedClock5;let f=await h.get(r),p=f.exists()?f.data():{};if(e.action==="answer"&&p.connectionId!==e.connectionId)return!1;let g=e.action==="offer"?{kind:"dashboardLink",viewerId:e.viewerId,connectionId:e.connectionId,offer:e.description,answer:null,expiresAt:((_window$KCSharedClock4=(_window$KCSharedClock5=window.KCSharedClock)===null||_window$KCSharedClock5===void 0?void 0:_window$KCSharedClock5.now())!==null&&_window$KCSharedClock4!==void 0?_window$KCSharedClock4:Date.now())+12e4}:{...p,answer:e.description,source:e.source};return h.set(r,g),!0;});}catch(h){if(o||h.code!=="sync-conflict")throw h;}}},subscribeDashboardOffers(n,e){return De(Xe(D,"clubs",n,"documents"),t=>e(t.docs.filter(r=>r.id.startsWith("dashboard_link_")).map(r=>r.data()).filter(r=>r.kind==="dashboardLink"&&r.offer&&!r.answer)),()=>{});},subscribeDashboardAnswer(n,e,t){return De(O(D,"clubs",n,"documents","dashboard_link_"+e),r=>t(r.exists()?r.data():null),()=>{});},async sendDashboardDiagnostic(n,e){if(!["presence","ping","pong"].includes(e.kind)||!/^[a-zA-Z0-9_-]{1,80}$/.test(e.id||""))throw Error("Ung\xFCltiger Verbindungstest");let t=O(D,"clubs",n,"state","current"),r=O(D,"clubs",n,"documents","dashboard_diagnostic_"+(e.kind==="presence"?"presence":"probe"));try{return await H(D,async c=>{var _window$KCSharedClock6,_window$KCSharedClock7;let l=await c.get(r),h=l.exists()?l.data():null,f=(_window$KCSharedClock6=(_window$KCSharedClock7=window.KCSharedClock)===null||_window$KCSharedClock7===void 0?void 0:_window$KCSharedClock7.now())!==null&&_window$KCSharedClock6!==void 0?_window$KCSharedClock6:Date.now();return e.kind==="pong"&&((h===null||h===void 0?void 0:h.kind)!=="ping"||h.id!==e.id||h.expiresAt<f)?!1:(c.set(r,{kind:e.kind,id:e.id,webrtc:e.webrtc===!0,expiresAt:f+(e.kind==="presence"?95e3:15e3)}),!0);});}catch(c){if(c.code!=="permission-denied")throw c;}let s=await Rt(t),o=s.exists()?s.data():{};if(!o.syncProtocol)return!1;let a={method:"dashboardDiagnostic",opId:"sync_"+crypto.randomUUID(),base:o,eveningStartedAt:o.currentEveningStartedAt||"",sideOperations:[]};return Be.transaction(n,a,async c=>{var _window$KCSharedClock8,_window$KCSharedClock9;let l=await c.get(r),h=l.exists()?l.data():null,f=(_window$KCSharedClock8=(_window$KCSharedClock9=window.KCSharedClock)===null||_window$KCSharedClock9===void 0?void 0:_window$KCSharedClock9.now())!==null&&_window$KCSharedClock8!==void 0?_window$KCSharedClock8:Date.now();return e.kind==="pong"&&((h===null||h===void 0?void 0:h.kind)!=="ping"||h.id!==e.id||h.expiresAt<f)?!1:(c.set(r,{kind:e.kind,id:e.id,webrtc:e.webrtc===!0,expiresAt:f+(e.kind==="presence"?95e3:15e3)}),!0);});},subscribeDashboardDiagnostic(n,e,t){if(!["presence","probe"].includes(e))throw Error("Ung\xFCltiger Diagnosekanal");return De(O(D,"clubs",n,"documents","dashboard_diagnostic_"+e),{includeMetadataChanges:!0},r=>{var _r$metadata,_r$metadata2;!((_r$metadata=r.metadata)!==null&&_r$metadata!==void 0&&_r$metadata.fromCache)&&!((_r$metadata2=r.metadata)!==null&&_r$metadata2!==void 0&&_r$metadata2.hasPendingWrites)&&t(r.exists()?r.data():null);},()=>{});},async processDrinkStationCommand(n,e,t=null){if(!/^station_[a-f0-9-]{36}$/.test(e))throw Error("Ung\xFCltige Buchungs-ID.");let r=O(D,"clubs",n,"state","current"),s=O(D,"clubs",n,"stationCommands",e);return M(n,t,D,async o=>{var _h$payload;let[a,c,l]=await Promise.all([o.get(r),o.get(s),o.get(O(D,"clubs",n,"stationControl","current"))]),h=c.exists()?c.data():null;if((h===null||h===void 0?void 0:h.status)!=="queued")return null;let f=l.exists()?l.data():null,p=h.kind==="undo"?(_h$payload=h.payload)===null||_h$payload===void 0?void 0:_h$payload.target:"",g=/^station_[a-f0-9-]{36}$/.test(p||"")?O(D,"clubs",n,"stationCommands",p):null,T=g?await o.get(g):null,C;try{if(!(f!==null&&f!==void 0&&f.uid)||f.uid!==h.uid||f.generation!==h.generation)throw Error("Die Ger\xE4tefreigabe wurde ge\xE4ndert.");C=window.KCDrinkLedger.apply(a.data(),h,e,T!==null&&T!==void 0&&T.exists()?T.data():null,new Date().toISOString());}catch(A){return o.set(s,{...h,status:"rejected",result:{description:A.message}}),{status:"rejected"};}return o.set(r,C.state),g&&o.set(g,{...T.data(),status:"reversed"}),o.set(s,{...h,status:"applied",result:C.result}),{status:"applied"};});},async closeDrinkStationEvening(n,e=null){let t=O(D,"clubs",n,"state","current");return M(n,e,D,async r=>{let s=await r.get(t),o=s.exists()?s.data():null;return o!==null&&o!==void 0&&o.currentEveningStartedAt&&o.stationClosedEvening!==o.currentEveningStartedAt&&r.set(t,{stationClosedEvening:o.currentEveningStartedAt},{merge:!0}),!0;});},async readTabletDocument(n,e){if(typeof e!="string"||e!=="clubs/"+n&&!e.startsWith("clubs/"+n+"/")||e.split("/").length%2)throw Error("Ung\xFCltiger Dokumentpfad");let t=await Rt(O(D,...e.split("/")));return t.exists()?t.data():null;},async commitTabletBatch(n,e={},t=null){if(!n||!Number.isSafeInteger(e.sequence)||e.sequence<1||!e.state||!Array.isArray(e.documents)||e.documents.length>400)throw Error("Ung\xFCltige Tablet-\xDCbertragung");t&&window.KCTabletAuth&&(t.authentication=await window.KCTabletAuth());let r=O(D,"clubs",n,"state","current");return M(n,t,D,async s=>{var _window$KCSharedClock0,_window$KCSharedClock1,_window$KCSharedClock10,_window$KCSharedClock11;let o=await s.get(r),a=o.exists()?o.data():{},c=Number(a.tabletSequence)||0;if(c>=e.sequence||e.baseSequence!==void 0&&e.baseSequence!==c)throw window.KCSharedCore.conflict(["Tablet-Warteschlange"]);let l=e.documents.map(g=>{if(typeof g.path!="string"||!g.path.startsWith("clubs/"+n+"/")&&g.path!=="clubs/"+n||g.path.split("/").length%2)throw Error("Ung\xFCltiger Tablet-Dokumentpfad");return{...g,ref:O(D,...g.path.split("/"))};}),h=await Promise.all(l.map(g=>s.get(g.ref))),f=g=>g&&typeof g=="object"&&g._methodName==="serverTimestamp"?G():Array.isArray(g)?g.map(f):g&&typeof g=="object"?Object.fromEntries(Object.entries(g).map(([T,C])=>[T,f(C)])):g,p=g=>f(window.KCSharedCore.normalizeGameData(g));s.set(r,{...a,...p(e.state),tabletSequence:e.sequence,tabletClock:{...(((_window$KCSharedClock0=window.KCSharedClock)===null||_window$KCSharedClock0===void 0||(_window$KCSharedClock1=_window$KCSharedClock0.captureTablet)===null||_window$KCSharedClock1===void 0?void 0:_window$KCSharedClock1.call(_window$KCSharedClock0))||{time:(_window$KCSharedClock10=(_window$KCSharedClock11=window.KCSharedClock)===null||_window$KCSharedClock11===void 0?void 0:_window$KCSharedClock11.now())!==null&&_window$KCSharedClock10!==void 0?_window$KCSharedClock10:Date.now()}),sequence:e.sequence,serverAt:G()}});for(let[g,T]of l.entries())if(T.path.startsWith("clubs/"+n+"/stationCommands/")){var _T$value;let C=h[g].exists()?h[g].data():null,A=(_T$value=T.value)===null||_T$value===void 0?void 0:_T$value.status;if(T.deleted||!["applied","rejected","reversed"].includes(A)||(C===null||C===void 0?void 0:C.status)!==(A==="reversed"?"applied":"queued"))throw window.KCSharedCore.conflict(["Getr\xE4nkestation"]);let R=A==="reversed"?{}:{result:p(T.value.result)};s.set(T.ref,{...C,status:A,...R});}else T.deleted?s.delete(T.ref):s.set(T.ref,p(T.value));return{sequence:e.sequence};});},async initializeSharedState(n,e,t){if(window.KCSharedClock&&(await KCSharedClock.useClub(n)),!Be)throw Error("Synchronisierung nicht geladen");return Be.initialize(n,e,t);},async commitSharedChanges(n,e,t){if(!Be)throw Error("Synchronisierung nicht geladen");return Be.changes(n,e,t);},async getSharedReceipt(n,e){let t=await Rt(O(D,"clubs",n,"syncCommands",e));return t.exists()?t.data():null;},subscribeClubList(n,e){return De(Xe(D,"clubs"),t=>n(t.docs.map(r=>({id:r.id,...r.data()}))),e);},async loadClubState(n){window.KCSharedClock&&KCSharedClock.useClub(n);let e=O(D,"clubs",n,"state","current"),t=await(typeof Rt=="function"?Rt:Nn)(e);return t.exists()?t.data():null;},async cancelGame(n,e={},t=null){var _window$KCSharedCore;let r=e.gameKey;if(!n||!((_window$KCSharedCore=window.KCSharedCore)!==null&&_window$KCSharedCore!==void 0&&_window$KCSharedCore.games.includes(r)))throw Error("Unbekanntes Spiel");let s=O(D,"clubs",n,"state","current");return M(n,t,D,async o=>{var _t$base,_c$dashboardGameOverv;let a=await o.get(s),c=a.exists()?a.data():{},l=r+"State",h=c[l];if(!(h!==null&&h!==void 0&&h.active))return h||null;if(!KCSharedCore.equal(KCSharedCore.clean(t===null||t===void 0||(_t$base=t.base)===null||_t$base===void 0?void 0:_t$base[l]),KCSharedCore.clean(h)))throw Error("Spielstand wurde inzwischen ge\xE4ndert. Bitte erneut abbrechen.");let f={tannenbaum:"createTannenbaumState",darts:"createDartsState",lotterie:"createLotterieState",tiberius:"createTiberiusState",mensch:"createMenschState",plusminus:"createPlusminusState",haushoch:"createHausState",haustief:"createHausState",sichern:"createSichernState",fuchsjagd:"createFuchsjagdState",tor:"createTorState"},p=KCExtraGames.keys.includes(r)?KCExtraGames.empty(r):["siebener","hindernis"].includes(r)?KCIndividual.empty(r):["blackjack","gluecksspirale"].includes(r)?KCTableGames.empty(r):r==="sechstage"?KCSixDays.empty():window[f[r]]();return p.revision=(Number(h.revision)||0)+1,p.eveningStartedAt=c.currentEveningStartedAt||"",Object.hasOwn(h,"stopwatch")&&(p.stopwatch=null),o.set(s,{[l]:p,dashboardActiveGame:null,dashboardGameOverview:{open:!0,revision:Number(((_c$dashboardGameOverv=c.dashboardGameOverview)===null||_c$dashboardGameOverv===void 0?void 0:_c$dashboardGameOverv.revision)||0)+1},dashboardDraw:null,dashboardRules:null,updatedAt:G()},{merge:!0}),p;});},async startNewEvening(n,e={},t=null){if(!n||!/^evening_[a-zA-Z0-9_-]{1,100}$/.test(e.opId||"")||!e.payload||!Number.isFinite(Date.parse(e.payload.currentEveningStartedAt)))throw Error("Ung\xFCltiger Kegelabend");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{var _a$dashboardGameOverv;let o=await s.get(r),a=o.exists()?o.data():{};if(a.eveningResetOp===e.opId)return{eveningStartedAt:a.currentEveningStartedAt,state:a};if(String(a.currentEveningStartedAt||"")!==String(e.expectedEvening||""))throw Error("Der Kegelabend wurde inzwischen gewechselt. Bitte neu laden.");let c=JSON.parse(JSON.stringify(e.payload)),l=c.currentEveningStartedAt,h=Object.keys(window.KCGameFinePolicy.titles),f={...c,...a};window.KCKranzPolicy&&(f.extraGameSettings={...(a.extraGameSettings||c.extraGameSettings||{}),kranzRules:Object.fromEntries(KCKranzPolicy.keys.map(A=>[A,KCKranzPolicy.configured(a,A)]))});for(let A of["currentEveningStartedAt","seatingOrder","spiele","selectedLoser","teamDrinks","bahnTimerStart","bahnTimerRunning","bahnElapsedSeconds","teamStopwatchActive","teamStopwatchRunning","teamStopwatchStart","teamCountdownDuration","teamCountdownRemainingBefore"])c[A]!==void 0&&(f[A]=c[A]);let p=[];for(let A of h){let R=O(D,"clubs",n,"liveGames",A),V=await s.get(R);p.push({key:A,target:R,revision:Number(V.exists()?V.data().revision:0)||0});}let g=O(D,"clubs",n,"live","seating");await s.get(g);let T=new Map();for(let A of a.syncProtocol?a.persons||[]:[...(c.persons||[]),...(a.persons||[])])T.set(String(A.name).trim().toLocaleLowerCase("de"),A);let C=[];for(let A of T.values()){let R=O(D,"clubs",n,"livePersons",this.getLivePersonId(A.name)),V=await s.get(R),k=V.exists()?V.data():{},F={...A,present:!1,attendanceStatus:"unknown",tisch:"",left:!1,leftAt:"",arrivalTime:"",leftEarlyAt:"",paid:0,boughtThrows:0,teamExtra:0,roundExtra:0,rounds:[],freeStrafen:[],tannenbaumCharges:[],individualChargeCents:0,strafTotal:0,gameFineBase:{otherNormalCents:0,otherTopCents:0,kingCents:0},drinks:Object.fromEntries((f.DRINKS||[]).map(Y=>[Y.key,0])),strafen:Object.fromEntries((f.STRAFEN||[]).map(Y=>[Y.key,0]))};C.push({target:R,person:F,previous:{...A,...k}});}if(window.KCPenaltyStats){let A=C.map(z=>z.previous),R=A.filter(z=>!z.isDrinksOnly&&(z.present||z.left)).map(z=>z.name),V=a.currentEveningStartedAt||e.expectedEvening,k=window.KCPenaltyStats.build({people:A,catalog:f.STRAFEN||[],logs:a.penaltyStatsLog||[],eveningStartedAt:V}),F=k.sessions.find(z=>z.key===k.currentKey),Y=new Map();for(let z of[...(c.kegelAbende||[]),...(a.kegelAbende||[])])Y.set(z.id||z.eveningStartedAt||z.date,z);if(R.length){let z={id:"stats_evening_"+encodeURIComponent(k.currentKey),date:window.KCPenaltyStats.date(V)||window.KCPenaltyStats.date(new Date().toISOString()),eveningStartedAt:V||null,attendees:R,statsPeople:(F===null||F===void 0?void 0:F.people)||[],updatedAt:new Date().toISOString()};Y.set(z.id,z);}f.kegelAbende=[...Y.values()];}Object.assign(f,{persons:C.map(A=>A.person),currentEveningStartedAt:l,eveningResetOp:e.opId,eveningResetRevision:(Number(a.eveningResetRevision)||0)+1,dashboardActiveGame:null,dashboardDraw:null,dashboardRandomDraw:null,dashboardRules:null,seatingOrder:Array(16).fill(""),dashboardGameOverview:{open:!0,revision:(Number((_a$dashboardGameOverv=a.dashboardGameOverview)===null||_a$dashboardGameOverv===void 0?void 0:_a$dashboardGameOverv.revision)||0)+1},dashboardCashView:null,dashboardClubContent:null,individualGameLedger:[],individualGameRevision:0,strafenHistory:[]});for(let A of p){var _window$KCExtraGames;let V={...((_window$KCExtraGames=window.KCExtraGames)!==null&&_window$KCExtraGames!==void 0&&_window$KCExtraGames.keys.includes(A.key)?window.KCExtraGames.empty(A.key):["siebener","hindernis"].includes(A.key)?window.KCIndividual.empty(A.key):["blackjack","gluecksspirale"].includes(A.key)?window.KCTableGames.empty(A.key):A.key==="sechstage"?window.KCSixDays.empty():c[A.key+"State"]||{}),active:!1,finished:!1,id:"",eveningStartedAt:l,revision:0};f[A.key+"State"]=V,s.set(A.target,{gameKey:A.key,state:V,eveningStartedAt:l,revision:A.revision+1,updatedClientAt:Date.now(),updatedClientId:"evening-reset",updatedAt:G()});}s.set(g,{seatingOrder:Array(16).fill(""),groupSettings:f.groupSettings||{},eveningStartedAt:l,updatedAt:G()});for(let A of C)s.set(A.target,{...A.person,eveningStartedAt:l,updatedAt:G()});return s.set(r,f),{eveningStartedAt:l,state:f};});},async saveClubState(n,e={},t=null){let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{var _a$dashboardRules,_a$penaltyStatsSettin,_a$clubCalendarData;let o=await s.get(r),a=o.exists()?o.data():{},c={...e};if(a.syncProtocol)throw Error("Vollst\xE4ndige lokale St\xE4nde d\xFCrfen nicht mehr hochgeladen werden. Bitte neu laden.");if(a.eveningResetRevision&&e.currentEveningStartedAt!==a.currentEveningStartedAt)throw Error("Der Kegelabend wurde inzwischen gewechselt. Bitte neu laden.");(_a$dashboardRules=a.dashboardRules)!==null&&_a$dashboardRules!==void 0&&_a$dashboardRules.revision?c.dashboardRules=a.dashboardRules:delete c.dashboardRules;for(let C of["dashboardCashView","cashStandingOrders","dashboardClubContent","dashboardGameOverview","dashboardRandomDraw"]){var _a$C;(_a$C=a[C])!==null&&_a$C!==void 0&&_a$C.revision?c[C]=a[C]:delete c[C];}a.gameOptionsRevision&&(c.gameOptions=a.gameOptions,c.gameOptionsRevision=a.gameOptionsRevision,c.gameOptionsCommands=a.gameOptionsCommands||[]),a.gameFineSettingsRevision&&(c.gameFineSettings=a.gameFineSettings||{},c.gameFineSettingsRevision=a.gameFineSettingsRevision,c.gameFineSettingsCommands=a.gameFineSettingsCommands||[]),((_a$penaltyStatsSettin=a.penaltyStatsSettings)===null||_a$penaltyStatsSettin===void 0?void 0:_a$penaltyStatsSettin.revision)&&(c.penaltyStatsSettings=a.penaltyStatsSettings);let l=["sechstageState","blackjackState","gluecksspiraleState","siebenerState","hindernisState","bergundtalState","ballermannState","lattenzaunState","guterschnittState","parteienspielState","dreieuroState","ebbeflutState","hochsprungState","pokerState","pfaelzerState","tausendState"],h=a.currentEveningStartedAt||l.map(C=>{var _a$C2;return(_a$C2=a[C])===null||_a$C2===void 0?void 0:_a$C2.eveningStartedAt;}).find(Boolean)||"",f=Date.parse(e.currentEveningStartedAt||""),p=Date.parse(h);if(l.some(C=>{var _a$C3;return(_a$C3=a[C])===null||_a$C3===void 0?void 0:_a$C3.revision;})&&(!Number.isFinite(f)||f<=p)){c.currentEveningStartedAt=h,c.individualGameLedger=a.individualGameLedger||[],c.individualGameRevision=Number(a.individualGameRevision)||0,Number(e.individualGameRevision||0)<Number(a.individualGameRevision||0)&&(c.dashboardActiveGame=a.dashboardActiveGame),Array.isArray(c.persons)&&(c.persons=c.persons.map(R=>{let V=c.individualGameLedger.filter(k=>k.eveningStartedAt===h&&String(k.personName).trim().toLocaleLowerCase("de")===String(R.name).trim().toLocaleLowerCase("de")).reduce((k,F)=>k+F.amountCents,0);return window.KCGameFinePolicy?{...R,individualChargeCents:V}:{...R,strafTotal:Math.round(((Number(R.strafTotal)||0)-(Number(R.individualChargeCents)||0)/100+V/100)*100)/100,individualChargeCents:V};}));for(let R of l){var _a$R;((_a$R=a[R])===null||_a$R===void 0?void 0:_a$R.revision)&&(c[R]=a[R]);}let C=Array.isArray(e.penaltyStatsLog)?e.penaltyStatsLog:a.penaltyStatsLog||[],A=R=>R.sixDaysRaceId||R.tableGameId||R.individualGameId;c.penaltyStatsLog=[...C.filter(R=>!A(R)),...(a.penaltyStatsLog||[]).filter(A)];}a.currentEveningStartedAt===c.currentEveningStartedAt&&Array.isArray(a.strafenHistory)&&(c.strafenHistory=[...a.strafenHistory.filter(C=>C.serverGameResult),...(Array.isArray(e.strafenHistory)?e.strafenHistory:a.strafenHistory).filter(C=>!C.serverGameResult)]);let g=(_a$clubCalendarData=a.clubCalendarData)!==null&&_a$clubCalendarData!==void 0&&_a$clubCalendarData.calendarRevision?a.clubCalendarData:a,T=null;if(Number(g.calendarRevision)>0){let C=Array.isArray(e.clubTermine)?e.clubTermine:[],A=(g.clubTermine||[]).map(V=>{let k=V.type==="geburtstag"&&!V.memberBirthdayName?C.find(F=>F.id===V.id&&F.type==="geburtstag"&&F.memberBirthdayName):null;return k?{...V,memberBirthdayName:k.memberBirthdayName}:V;}),R=Number(g.calendarRevision)+(JSON.stringify(A)!==JSON.stringify(g.clubTermine||[])?1:0);T={clubTermine:A,clubKegelSerie:g.clubKegelSerie||null,calendarRevision:R},Object.assign(c,T,{clubCalendarData:T});}if(window.KCGameFinePolicy&&Array.isArray(c.persons)){if(a.currentEveningStartedAt===c.currentEveningStartedAt){let C=[];for(let A of c.persons){let R=await s.get(O(D,"clubs",n,"livePersons",this.getLivePersonId(A.name)));C.push(R.exists()?{...A,strafen:R.data().strafen||A.strafen}:A);}c.persons=C;}c.persons=window.KCGameFinePolicy.applyTotals(c.persons,{...a,...c},a);}return s.set(r,{...c,updatedAt:G()},{merge:!0}),T;});},async updateClubCalendar(n,e={},t=null){if(!n||!window.KCKegelCalendar)throw new Error("Kalenderzugriff nicht verf\xFCgbar");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{var _a$clubCalendarData2;let o=await s.get(r),a=o.exists()?o.data():{},c=(_a$clubCalendarData2=a.clubCalendarData)!==null&&_a$clubCalendarData2!==void 0&&_a$clubCalendarData2.calendarRevision?{...a,...a.clubCalendarData}:a,l=!Array.isArray(c.clubTermine)&&!c.calendarRevision&&Array.isArray(e.bootstrapEvents)?{...c,clubTermine:e.bootstrapEvents}:c,h=window.KCKegelCalendar.perform(l,e),f=!c.calendarRevision||JSON.stringify(h.clubTermine)!==JSON.stringify(c.clubTermine||[])||JSON.stringify(h.clubKegelSerie)!==JSON.stringify(c.clubKegelSerie||null),p=(Number(c.calendarRevision)||0)+(f?1:0),g={...h,calendarRevision:p},T=!a.clubCalendarData||JSON.stringify(a.clubTermine)!==JSON.stringify(h.clubTermine)||JSON.stringify(a.clubKegelSerie)!==JSON.stringify(h.clubKegelSerie)||a.calendarRevision!==p;return(f||T)&&s.set(r,{...g,clubCalendarData:g,updatedAt:G()},{merge:!0}),g;});},async setDashboardGameOverview(n,e={},t=null){if(!n||!window.KCGameOverview||typeof e.open!="boolean"||!Number.isSafeInteger(e.expectedRevision)||!/^overview_[a-zA-Z0-9_-]{1,100}$/.test(e.opId||""))throw Error("Ung\xFCltige Spiel\xFCbersicht.");if(e.gameKey!==void 0&&(e.open||!window.KCGameOverview.catalog.some(s=>s.key===e.gameKey)))throw Error("Ung\xFCltiges Dashboard-Spiel.");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{var _window$KCSharedClock12,_window$KCSharedClock13;let o=await s.get(r),a=o.exists()?o.data():{},c=a.dashboardGameOverview||{};if((c.commands||[]).includes(e.opId))return c;if(Number(c.revision||0)!==e.expectedRevision)throw Error("Spiel\xFCbersicht wurde inzwischen ge\xE4ndert. Bitte erneut versuchen.");if(e.gameKey!==void 0){var _f$history;let f=a[e.gameKey+"State"];if(!f||!f.active&&!f.finished&&!f.id&&!f.startedAt&&!((_f$history=f.history)!==null&&_f$history!==void 0&&_f$history.length)||f.eveningStartedAt&&a.currentEveningStartedAt&&f.eveningStartedAt!==a.currentEveningStartedAt)throw Error("Dieses Spiel wurde noch nicht gestartet oder geh\xF6rt zu einem anderen Kegelabend.");}let l={open:e.open,gameStamp:window.KCGameOverview.context(a).gameStamp,revision:Number(c.revision||0)+1,commands:[...(c.commands||[]),e.opId].slice(-128)},h={dashboardGameOverview:l,updatedAt:G()};if(e.gameKey!==void 0&&(l.selectedGame=e.gameKey,l.selectedAt=new Date((_window$KCSharedClock12=(_window$KCSharedClock13=window.KCSharedClock)===null||_window$KCSharedClock13===void 0?void 0:_window$KCSharedClock13.now())!==null&&_window$KCSharedClock12!==void 0?_window$KCSharedClock12:Date.now()).toISOString(),h.dashboardActiveGame=e.gameKey,h.dashboardDraw=null,h.dashboardRandomDraw=null),l.open||e.gameKey!==void 0)for(let f of["dashboardCashView","dashboardRules","dashboardClubContent"]){var _a$f;((_a$f=a[f])===null||_a$f===void 0?void 0:_a$f.open)&&(h[f]={...a[f],open:!1,revision:Number(a[f].revision||0)+1});}return s.set(r,h,{merge:!0}),l;});},async updateGameOptions(n,e={},t=null){var _window$KCGameOptions;if(!n||!((_window$KCGameOptions=window.KCGameOptions)!==null&&_window$KCGameOptions!==void 0&&_window$KCGameOptions.valid(e.options))||!/^options_[a-zA-Z0-9_-]{1,100}$/.test(e.opId||"")||!Number.isSafeInteger(e.expectedRevision))throw Error("Ung\xFCltige Spieleinstellungen.");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{let o=await s.get(r),a=o.exists()?o.data():{};if((a.gameOptionsCommands||[]).includes(e.opId))return{options:a.gameOptions,revision:a.gameOptionsRevision};if(Number(a.gameOptionsRevision||0)!==e.expectedRevision)throw Error("Spieleinstellungen wurden inzwischen ge\xE4ndert. Bitte erneut versuchen.");let c=window.KCGameOptions.value(e.options),l=Number(a.gameOptionsRevision||0)+1;return s.set(r,{gameOptions:c,gameOptionsRevision:l,gameOptionsCommands:[...(a.gameOptionsCommands||[]),e.opId].slice(-128),updatedAt:G()},{merge:!0}),{options:c,revision:l};});},async drawRandomGame(n,e={},t=null){if(!n||!window.KCGameOptions||!["draw","close"].includes(e.action)||!/^gamedraw_[a-zA-Z0-9_-]{1,100}$/.test(e.opId||""))throw Error("Ung\xFCltige Spielauslosung.");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{let o=await s.get(r),a=o.exists()?o.data():{},c=a.dashboardRandomDraw;if(e.action==="close")return(c===null||c===void 0?void 0:c.id)===e.drawId&&s.set(r,{dashboardRandomDraw:{...c,closed:!0,revision:Number(c.revision||0)+1},updatedAt:G()},{merge:!0}),null;if((c===null||c===void 0?void 0:c.id)===e.opId)return c;if(Number(a.gameOptionsRevision||0)!==e.expectedRevision||String(a.currentEveningStartedAt||"")!==String(e.eveningStartedAt||""))throw Error("Einstellungen oder Kegelabend wurden inzwischen ge\xE4ndert. Bitte erneut versuchen.");let l=window.KCGameOptions.pool(a.gameOptions),h=window.KCGameOptions.pick(a.gameOptions),f=T=>T.icon+" "+T.title,p={id:e.opId,kind:"game",title:"\u{1F3B2} Zuf\xE4lliges Kegelspiel",frames:l.map(f),winner:f(h),winnerKey:h.key,startedAt:Date.now(),steps:26,interval:110,revision:Number((c===null||c===void 0?void 0:c.revision)||0)+1,closed:!1},g={dashboardRandomDraw:p,updatedAt:G()};for(let T of["dashboardCashView","dashboardRules","dashboardClubContent"]){var _a$T;((_a$T=a[T])===null||_a$T===void 0?void 0:_a$T.open)&&(g[T]={...a[T],open:!1,revision:Number(a[T].revision||0)+1});}return s.set(r,g,{merge:!0}),p;});},async updateGameFineSettings(n,e={},t=null){let r=window.KCGameFinePolicy;if(!n||!r||!Object.hasOwn(r.titles,e.gameKey)||typeof e.onTop!="boolean"||!/^fine_[a-zA-Z0-9_-]{1,100}$/.test(e.opId||""))throw Error("Ung\xFCltige OnTop-Einstellung.");let s=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async o=>{let a=await o.get(s),c=a.exists()?a.data():{};if((c.gameFineSettingsCommands||[]).includes(e.opId))return{gameFineSettings:c.gameFineSettings||{},gameFineSettingsRevision:c.gameFineSettingsRevision||0};let l={...(c.gameFineSettings||{}),[e.gameKey]:e.onTop},h=Number(c.gameFineSettingsRevision||0)+1,f=[];for(let T of c.persons||[]){let C=await o.get(O(D,"clubs",n,"livePersons",this.getLivePersonId(T.name)));f.push(C.exists()?{...T,strafen:C.data().strafen||T.strafen}:T);}let p={gameFineSettings:l,gameFineSettingsRevision:h},g=r.applyTotals(f,{...c,...p},c);return o.set(s,{...p,persons:g,gameFineSettingsCommands:[...(c.gameFineSettingsCommands||[]),e.opId].slice(-128),updatedAt:G()},{merge:!0}),p;});},subscribeClubContent(n,e,t,r){if(!n||!["notes","statutes","penalties"].includes(e))throw Error("Ung\xFCltige Clubunterlage.");return De(O(D,"clubs",n,"documents",e),s=>t(s.exists()?s.data():null),r);},async updateClubContent(n,e={},t=null){if(!n||!window.KCClubContent||!["notes","statutes","penalties"].includes(e.kind))throw Error("Clubunterlagen nicht verf\xFCgbar.");let r=O(D,"clubs",n,"documents",e.kind);return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{let o=await s.get(r),a=o.exists()?o.data():null,c=window.KCClubContent.change(e.kind,a,e);return c!==a&&s.set(r,{...c,updatedAt:G()}),c;});},async setClubContentDashboard(n,e={},t=null){if(!n||!window.KCClubContent)throw Error("Dashboard-Steuerung nicht verf\xFCgbar.");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{let o=await s.get(r),a=o.exists()?o.data():{},c=a.dashboardClubContent||null,l=window.KCClubContent.view(c,e);if(l===c)return l;let h={dashboardClubContent:l,updatedAt:G()};if(e.action==="open")for(let f of["dashboardCashView","dashboardRules","dashboardGameOverview"]){var _a$f2;((_a$f2=a[f])===null||_a$f2===void 0?void 0:_a$f2.open)&&(h[f]={...a[f],open:!1,revision:Number(a[f].revision||0)+1});}return s.set(r,h,{merge:!0}),l;});},async setCashDashboardView(n,e={},t=null){if(!n||typeof e.open!="boolean"||!/^cash_[a-zA-Z0-9_-]{1,100}$/.test(e.opId)||!Number.isSafeInteger(e.expectedRevision)||e.expectedRevision<0)throw Error("Ung\xFCltige Abrechnungsanzeige");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{var _window$KCBirthdays,_window$KCBirthdays2;let o=await s.get(r),a=o.exists()?o.data():{},c=a.dashboardCashView||{};if((c.commands||[]).includes(e.opId))return c;if(Number(c.revision||0)!==e.expectedRevision)throw Error("Dashboard-Ansicht wurde inzwischen ge\xE4ndert. Bitte erneut versuchen.");if(e.mode!==void 0&&!["cash","summary","penalties","drinks","games"].includes(e.mode))throw Error("Ung\xFCltige Dashboard-Ansicht");if(e.from&&!((_window$KCBirthdays=window.KCBirthdays)!==null&&_window$KCBirthdays!==void 0&&_window$KCBirthdays.parse(e.from))||e.to&&!((_window$KCBirthdays2=window.KCBirthdays)!==null&&_window$KCBirthdays2!==void 0&&_window$KCBirthdays2.parse(e.to))||e.from&&e.to&&e.from>e.to)throw Error("Ung\xFCltiger Zeitraum");let l={open:e.open,mode:e.mode||"cash",custom:e.custom===!0,from:e.from||"",to:e.to||"",revision:Number(c.revision||0)+1,commands:[...(c.commands||[]),e.opId].slice(-128)},h={dashboardCashView:l,updatedAt:G()};if(l.open)for(let f of["dashboardClubContent","dashboardGameOverview","dashboardRules"]){var _a$f3;((_a$f3=a[f])===null||_a$f3===void 0?void 0:_a$f3.open)&&(h[f]={...a[f],open:!1,revision:Number(a[f].revision||0)+1});}return s.set(r,h,{merge:!0}),l;});},async updateCashStandingOrders(n,e={},t=null){if(!n||!window.KCCashOverview||!["upsert","delete"].includes(e.action)||!/^cash_[a-zA-Z0-9_-]{1,100}$/.test(e.opId)||!Number.isSafeInteger(e.expectedRevision)||e.expectedRevision<0||e.action==="upsert"&&!window.KCCashOverview.validOrder(e.order)||e.action==="delete"&&!/^standing_[a-zA-Z0-9_-]{1,100}$/.test(e.id))throw Error("Ung\xFCltiger Dauerauftrag");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{let o=await s.get(r),a=o.exists()?o.data():{},c=a.cashStandingOrders||{};if((c.commands||[]).includes(e.opId))return c;if(Number(c.revision||0)!==e.expectedRevision)throw Error("Dauerauftr\xE4ge wurden inzwischen ge\xE4ndert. Bitte erneut versuchen.");let l=window.KCCashOverview.settleOrders(c),h=(c.orders||[]).slice();if(e.action==="delete")h=h.filter(p=>p.id!==e.id);else{let{id:p,personName:g,amountCents:T,interval:C,startDate:A,endDate:R=""}=e.order;if(!(a.persons||[]).some(V=>V.name===g&&!V.isGuest&&!V.isDrinksOnly))throw Error("Bitte ein vorhandenes Mitglied ausw\xE4hlen.");if(h.some(V=>V.id!==p&&window.KCCashOverview.key(V.personName)===window.KCCashOverview.key(g)))throw Error("F\xFCr dieses Mitglied besteht bereits ein Dauerauftrag.");h=h.filter(V=>V.id!==p),h.push({id:p,personName:g,amountCents:T,interval:C,startDate:A,endDate:R});}if(h.length>200)throw Error("Zu viele Dauerauftr\xE4ge.");let f={...window.KCCashOverview.settleOrders({...l,orders:h}),revision:Number(c.revision||0)+1,commands:[...(c.commands||[]),e.opId].slice(-128)};return s.set(r,{cashStandingOrders:f,updatedAt:G()},{merge:!0}),f;});},async updateCashIncome(n,e={},t=null){if(!n||!window.KCCashOverview||!["upsert","delete"].includes(e.action)||!/^cash_[a-zA-Z0-9_-]{1,100}$/.test(e.opId)||!Number.isSafeInteger(e.expectedRevision))throw Error("Ung\xFCltige Einnahme");if(e.action==="upsert"&&!window.KCCashOverview.validPayment(e.payment))throw Error("Bitte g\xFCltigen Betrag, Datum und Beschreibung eingeben.");let r=O(D,"clubs",n,"state","current");return M(n,t,D,async s=>{let o=await s.get(r),a=o.exists()?o.data():{},c=a.cashStandingOrders||{};if((c.commands||[]).includes(e.opId))return c;if(Number(c.revision||0)!==e.expectedRevision)throw Error("Einnahmen wurden inzwischen ge\xE4ndert. Bitte erneut \xF6ffnen.");let l=window.KCCashOverview.settleOrders(c),h=new Set(c.suppressedDues||[]),f=(l.payments||[]).slice();if(e.action==="delete"){let g=f.find(T=>T.id===e.id);if(!g)throw Error("Einnahme nicht gefunden.");g.kind==="standing"&&g.orderId&&h.add(window.KCCashOverview.dueKey(g.orderId,g.date)),f=f.filter(T=>T.id!==e.id);}else{let{id:g,personName:T,amountCents:C,date:A,description:R,kind:V,orderId:k=""}=e.payment;if(A>window.KCCashOverview.today())throw Error("Zahlungseing\xE4nge k\xF6nnen erst am Zahlungstag gebucht werden.");if(T&&!(a.persons||[]).some(z=>z.name===T&&!z.isDrinksOnly&&!z.isGuest))throw Error("Mitglied nicht gefunden.");if(V==="standing"&&!(c.orders||[]).some(z=>z.id===k&&z.personName===T))throw Error("Bitte einen passenden Dauerauftrag w\xE4hlen.");if(V==="standing"&&f.some(z=>z.id!==g&&z.orderId===k&&z.date.slice(0,7)===A.slice(0,7)))throw Error("Dieser Dauerauftrag ist f\xFCr diesen Zahlungstag bereits gebucht.");let F=f.find(z=>z.id===g),Y=(F===null||F===void 0?void 0:F.date)===A?F.incurredAt||A+"T12:00:00Z":A===window.KCCashOverview.today()?new Date().toISOString():A+"T12:00:00Z";F!==null&&F!==void 0&&F.orderId&&(F.orderId!==k||F.date.slice(0,7)!==A.slice(0,7)||V!=="standing")&&h.add(window.KCCashOverview.dueKey(F.orderId,F.date)),f=f.filter(z=>z.id!==g),f.push({id:g,personName:T,amountCents:C,date:A,incurredAt:Y,description:R,kind:V,orderId:k,...(F!==null&&F!==void 0&&F.automatic?{automatic:!0}:{})});}if(f.length>3e3)throw Error("Zu viele Einnahmen im Zahlungsbuch.");let p={...l,payments:f,suppressedDues:[...h],revision:Number(c.revision||0)+1,commands:[...(c.commands||[]),e.opId].slice(-128)};return s.set(r,{cashStandingOrders:p,updatedAt:G()},{merge:!0}),p;});},async ensureCashStandingIncome(n,e={},t=null){if(!n||!window.KCCashOverview||!/^cash_[a-zA-Z0-9_-]{1,100}$/.test(e.opId))throw Error("Ung\xFCltige Monatsbuchung");let r=O(D,"clubs",n,"state","current");return M(n,t,D,async s=>{let o=await s.get(r),a=o.exists()?o.data():{},c=a.cashStandingOrders||{},l=window.KCCashOverview.settleOrders(c);if(l===c)return c;if((l.payments||[]).length>3e3)throw Error("Zu viele Einnahmen im Zahlungsbuch.");let h={...l,revision:Number(c.revision||0)+1,commands:[...(c.commands||[]),e.opId].slice(-128)};return s.set(r,{cashStandingOrders:h,updatedAt:G()},{merge:!0}),h;});},async setDashboardRules(n,e={},t=null){var _window$KCIndividual,_window$KCIndividual2,_window$KCExtraGames2;if(!n||!["open","close"].includes(e.action)||!["sechstage","gluecksspirale","siebener","hindernis","bergundtal","ballermann","lattenzaun","guterschnitt","parteienspiel","dreieuro","ebbeflut","hochsprung","poker","pfaelzer","tausend"].includes(e.gameKey)||typeof e.token!="string"||!/^rules_session_[a-zA-Z0-9_-]{1,100}$/.test(e.token)||typeof e.opId!="string"||!/^rules_[a-zA-Z0-9_-]{1,100}$/.test(e.opId))throw new Error("Ung\xFCltige Regelanzeige");if(e.rulesConfig!==void 0&&!(e.gameKey==="hindernis"&&(_window$KCIndividual=window.KCIndividual)!==null&&_window$KCIndividual!==void 0&&_window$KCIndividual.validSettings(e.rulesConfig)||e.gameKey==="siebener"&&(_window$KCIndividual2=window.KCIndividual)!==null&&_window$KCIndividual2!==void 0&&_window$KCIndividual2.validSevenSettings(e.rulesConfig)||(_window$KCExtraGames2=window.KCExtraGames)!==null&&_window$KCExtraGames2!==void 0&&_window$KCExtraGames2.keys.includes(e.gameKey)&&window.KCExtraGames.validSettings(e.gameKey,e.rulesConfig)))throw new Error("Ung\xFCltige Spielregeln");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{let o=await s.get(r),a=o.exists()?o.data():{},c=a.dashboardRules||{};if((c.commands||[]).includes(e.opId)||e.action==="close"&&(!c.open||c.token!==e.token||c.gameKey!==e.gameKey))return c;let l={schema:1,open:e.action==="open",gameKey:e.gameKey,...(["hindernis","siebener","bergundtal","ballermann","lattenzaun","guterschnitt","parteienspiel","dreieuro","ebbeflut","hochsprung","poker","pfaelzer","tausend"].includes(e.gameKey)&&e.rulesConfig?{rulesConfig:JSON.parse(JSON.stringify(e.rulesConfig))}:{}),token:e.token,revision:(Number(c.revision)||0)+1,commands:[...(c.commands||[]),e.opId].slice(-128)},h={dashboardRules:l,updatedAt:G()};if(l.open)for(let f of["dashboardClubContent","dashboardGameOverview","dashboardCashView"]){var _a$f4;((_a$f4=a[f])===null||_a$f4===void 0?void 0:_a$f4.open)&&(h[f]={...a[f],open:!1,revision:Number(a[f].revision||0)+1});}return s.set(r,h,{merge:!0}),l;});},async updatePenaltyStatsSettings(n,e={},t=null){if(!n||!window.KCPenaltyStats)throw new Error("Statistikzugriff nicht verf\xFCgbar");let r=O(D,"clubs",n,"state","current");return(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{let o=await s.get(r),a=o.exists()?o.data():{},c=a.penaltyStatsSettings||{},l=e.scope==="drinks"?c.drinks:c;if(typeof e.id!="string"||!/^stats_[a-zA-Z0-9_-]{1,100}$/.test(e.id))throw new Error("Ung\xFCltige Statistikaktion");if((l===null||l===void 0?void 0:l.lastRequestId)===e.id)return l;if((Number(l===null||l===void 0?void 0:l.revision)||0)!==e.expectedRevision)throw new Error("Statistikstart wurde inzwischen ge\xE4ndert. Bitte die aktuellen Daten laden.");if(!["date","now"].includes(e.mode)||e.mode==="date"&&!/^\d{4}-\d{2}-\d{2}$/.test(e.startDate||""))throw new Error("G\xFCltigen Starttermin w\xE4hlen");let h=new Date().toISOString(),f=[];if(e.mode==="now")for(let T of a.persons||[]){let C=await s.get(O(D,"clubs",n,"livePersons",this.getLivePersonId(T.name)));f.push(C.exists()?{...T,...C.data(),name:T.name}:T);}let p=window.KCPenaltyStats.build({people:f,catalog:a.STRAFEN||[],evenings:a.kegelAbende||[],logs:a.penaltyStatsLog||[],eveningStartedAt:a.currentEveningStartedAt||""}),g={...(e.scope==="drinks"?{}:c),schema:1,mode:e.mode,startDate:e.mode==="date"?e.startDate:window.KCPenaltyStats.date(h),startAt:e.mode==="now"?h:null,baseline:e.mode==="now"?window.KCPenaltyStats.baseline(p):null,revision:(Number(l===null||l===void 0?void 0:l.revision)||0)+1,lastRequestId:e.id};if(e.mode==="date"&&window.KCPenaltyStats.date(e.startDate)!==e.startDate)throw new Error("G\xFCltigen Starttermin w\xE4hlen");if(e.scope==="drinks"){if(!window.KCActivityReports)throw Error("Getr\xE4nkestatistik nicht geladen");g.baseline=e.mode==="now"?window.KCActivityReports.drinkSession({persons:a.persons||[],drinks:(a.DRINKS||[]).map(T=>{var _a$prices;return{...T,price:((_a$prices=a.prices)===null||_a$prices===void 0?void 0:_a$prices[T.key])||0};}),date:h,eveningStartedAt:a.currentEveningStartedAt||""}):null;}return s.set(r,{penaltyStatsSettings:e.scope==="drinks"?{...c,drinks:g}:g,updatedAt:G()},{merge:!0}),g;});},async setGameStopwatch(n,e={},t=null){var _window$KCSharedCore2;let r=e.gameKey,s=window.KCGameStopwatch;if(!n||!s||!((_window$KCSharedCore2=window.KCSharedCore)!==null&&_window$KCSharedCore2!==void 0&&_window$KCSharedCore2.games.includes(r)))throw Error("Stoppuhr nicht verf\xFCgbar.");let o=O(D,"clubs",n,"state","current"),a=r+"State",c=s.now();return M(n,t,D,async l=>{let h=await l.get(o),f=h.exists()?h.data():{},p=f[a];if((f.currentEveningStartedAt||"")!==e.eveningStartedAt||p!==null&&p!==void 0&&p.eveningStartedAt&&p.eveningStartedAt!==e.eveningStartedAt)throw Error("Der Kegelabend wurde inzwischen gewechselt.");let g=s.toggle(r,p,f.teamStopwatchActive,e,c);return l.set(o,{[a]:{...p,stopwatch:g},updatedAt:G()},{merge:!0}),g;});},async transactSechsGame(n,e={},t=null){var _window$KCGameStopwat;if(!n||!window.KCSixDays)throw new Error("Rennspiel ist noch nicht verf\xFCgbar");let r=O(D,"clubs",n,"state","current"),s=(_window$KCGameStopwat=window.KCGameStopwatch)===null||_window$KCGameStopwat===void 0?void 0:_window$KCGameStopwat.now();return(typeof M=="function"?M.bind(null,n,t):H)(D,async o=>{var _c$sechstageState,_c$sechstageState2,_c$sechstageState3,_c$sechstageState4,_window$KCGameOptions2,_window$KCGameResults;let a=await o.get(r),c=a.exists()?a.data():{},l=String(c.currentEveningStartedAt||((_c$sechstageState=c.sechstageState)===null||_c$sechstageState===void 0?void 0:_c$sechstageState.eveningStartedAt)||""),h=e.action==="start"&&!e.eveningStartedAt&&((_c$sechstageState2=c.sechstageState)===null||_c$sechstageState2===void 0?void 0:_c$sechstageState2.eveningStartedAt)===l&&((_c$sechstageState3=c.sechstageState)===null||_c$sechstageState3===void 0||(_c$sechstageState3=_c$sechstageState3.commands)===null||_c$sechstageState3===void 0?void 0:_c$sechstageState3.includes(e.opId));if(String(e.eveningStartedAt||"")!==l&&!h)throw new Error("Der Kegelabend wurde inzwischen gewechselt");let f=new Date(e.now||Date.now()).toISOString(),p=l||f,g=((_c$sechstageState4=c.sechstageState)===null||_c$sechstageState4===void 0?void 0:_c$sechstageState4.eveningStartedAt)===l?c.sechstageState:window.KCSixDays.empty(),T={people:Array.isArray(c.persons)?c.persons:[],catalog:c.STRAFEN||[],now:f,eveningStartedAt:p,club:e.clubName||n};e.action==="start"&&(e={...(window.KCKranzPolicy?KCKranzPolicy.startRequest(c,"sechstage",e):e),onTop:e.onTop===!0&&((_window$KCGameOptions2=window.KCGameOptions)===null||_window$KCGameOptions2===void 0?void 0:_window$KCGameOptions2.eligible(c.gameOptions,"sechstage"))===!0});let C=window.KCSixDays.command(g,e,T),A=C.state,R=C.repeat?{changes:[],added:[],removed:[]}:window.KCSixDays.effects(g,A,e,T),V=C.repeat?(A.receipts||[]).find(y=>y.id===e.opId):null,k=C.repeat?(V===null||V===void 0?void 0:V.changes)||[]:R.changes,F=new Map();for(let y of k){let b=this.getLivePersonId(y.personName);F.has(b)||F.set(b,{name:y.personName,changes:[]}),F.get(b).changes.push(y);}let Y=await Promise.all([...F].map(async([y,b])=>{let v=O(D,"clubs",n,"livePersons",y),E=await o.get(v),w=T.people.find(J=>J.name===b.name)||{};return{...b,ref:v,current:E.exists()?E.data():w,exists:E.exists()};})),z=[],ne=c.penaltyStatsLog||[];for(let y of Y){let b={...(y.current.strafen||{})};for(let v of y.changes){let E=Number(b[v.key]||0)+(C.repeat?0:v.delta);if(!Number.isSafeInteger(E)||E<0)throw new Error("Strafz\xE4hler wurde inzwischen ge\xE4ndert. R\xFCckg\xE4ngig nicht m\xF6glich.");b[v.key]=E,z.push({personName:y.name,category:"strafen",key:v.key,value:E});}y.finalValues=b,C.repeat||o.set(y.ref,{...(y.exists?{}:{present:!!y.current.present,isGuest:!!y.current.isGuest,left:!!y.current.left,drinks:{...(y.current.drinks||{})}}),name:y.name,strafen:b,updatedAt:G()},{merge:!0});}if(!C.repeat&&window.KCGameStopwatch){let y=KCGameStopwatch.advance("sechstage",g,A,{at:s,newRound:e.action==="start"});y!==void 0&&(A.stopwatch=y);}let I=e.action==="undo"&&g.finished&&!A.finished?(c.strafenHistory||[]).filter(y=>y.id!=="game_result_sechstage_"+g.id):c.strafenHistory,_=((_window$KCGameResults=window.KCGameResults)===null||_window$KCGameResults===void 0?void 0:_window$KCGameResults.append(I,"sechstage",A,{now:f,groups:c.groupSettings||{},server:!0,catalog:c.STRAFEN||[]}))||c.strafenHistory||[];if(!C.repeat){A.receipts=[...(A.receipts||[]),{id:e.opId,changes:R.changes}].slice(-64);let y=new Set(R.removed);ne=[...(c.penaltyStatsLog||[]).filter(v=>!y.has(v.id)),...R.added];let b=window.KCGameFinePolicy?window.KCGameFinePolicy.applyTotals((c.persons||[]).map(v=>{let E=Y.find(w=>w.name===v.name);return E?{...v,strafen:E.finalValues}:v;}),{...c,sechstageState:A,strafenHistory:_,currentEveningStartedAt:p},c):null;o.set(r,{sechstageState:A,...(b?{persons:b}:{}),currentEveningStartedAt:p,dashboardActiveGame:"sechstage",penaltyStatsLog:ne,strafenHistory:_,updatedAt:G()},{merge:!0});}return{gameResultsHistory:_.filter(y=>y.serverGameResult),state:A,eveningStartedAt:l||A.eveningStartedAt,counters:z,added:R.added,removed:R.removed,gameStats:ne.filter(y=>y.sixDaysRaceId),repeat:C.repeat};});},async transactTableGame(n,e={},t=null){var _window$KCGameStopwat2;let r=e.gameKey;if(!["blackjack","gluecksspirale"].includes(r))throw new Error("Unbekanntes Spiel");let s=r+"State";if(!n||!window.KCTableGames)throw new Error("Spiel ist noch nicht verf\xFCgbar");let o=O(D,"clubs",n,"state","current"),a=(_window$KCGameStopwat2=window.KCGameStopwatch)===null||_window$KCGameStopwat2===void 0?void 0:_window$KCGameStopwat2.now();return(typeof M=="function"?M.bind(null,n,t):H)(D,async c=>{var _h$s,_h$s2,_h$s3,_h$s4,_window$KCGameOptions3,_window$KCGameResults2;let l=await c.get(o),h=l.exists()?l.data():{},f=String(h.currentEveningStartedAt||((_h$s=h[s])===null||_h$s===void 0?void 0:_h$s.eveningStartedAt)||""),p=e.action==="start"&&!e.eveningStartedAt&&((_h$s2=h[s])===null||_h$s2===void 0?void 0:_h$s2.eveningStartedAt)===f&&((_h$s3=h[s])===null||_h$s3===void 0||(_h$s3=_h$s3.commands)===null||_h$s3===void 0?void 0:_h$s3.includes(e.opId));if(String(e.eveningStartedAt||"")!==f&&!p)throw new Error("Der Kegelabend wurde inzwischen gewechselt");let g=new Date(e.now||Date.now()).toISOString(),T=f||g,C=((_h$s4=h[s])===null||_h$s4===void 0?void 0:_h$s4.eveningStartedAt)===f?h[s]:window.KCTableGames.empty(r),A={people:Array.isArray(h.persons)?h.persons:[],catalog:h.STRAFEN||[],now:g,eveningStartedAt:T,club:e.clubName||n},R,V;e.action==="start"&&(e={...(window.KCKranzPolicy?KCKranzPolicy.startRequest(h,r,e):e),onTop:e.onTop===!0&&((_window$KCGameOptions3=window.KCGameOptions)===null||_window$KCGameOptions3===void 0?void 0:_window$KCGameOptions3.eligible(h.gameOptions,e.gameKey))===!0});try{R=window.KCTableGames.command(C,e,A),V=R.repeat?{changes:[],added:[],removed:[]}:window.KCTableGames.effects(C,R.state,e,A);}catch(v){throw v.code="table-game-rejected",v;}let k=R.state;if(e.action==="start"&&Object.assign(k,{gameFineFrozen:!0,onTop:e.onTop===!0,gameFineOnTop:e.onTop===!0}),k.gameFineFrozen)for(let v of V.moneyAdded||[])Object.assign(v,{gameFineFrozen:!0,onTop:k.onTop===!0});let F=R.repeat?(k.receipts||[]).find(v=>v.id===e.opId):null,Y=R.repeat?(F===null||F===void 0?void 0:F.changes)||[]:V.changes,z=new Map();for(let v of Y){let E=this.getLivePersonId(v.personName);z.has(E)||z.set(E,{name:v.personName,changes:[]}),z.get(E).changes.push(v);}let ne=await Promise.all([...z].map(async([v,E])=>{let w=O(D,"clubs",n,"livePersons",v),J=await c.get(w),ae=A.people.find(_e=>_e.name===E.name)||{};return{...E,ref:w,current:J.exists()?J.data():ae,exists:J.exists()};})),I=[],_=h.penaltyStatsLog||[];for(let v of ne){let E={...(v.current.strafen||{})};for(let w of v.changes){let J=Number(E[w.key]||0)+(R.repeat?0:w.delta);if(!Number.isSafeInteger(J)||J<0)throw new Error("Strafz\xE4hler wurde inzwischen ge\xE4ndert. R\xFCckg\xE4ngig nicht m\xF6glich.");E[w.key]=J,I.push({personName:v.name,category:"strafen",key:w.key,value:J});}v.finalValues=E,R.repeat||c.set(v.ref,{...(v.exists?{}:{present:!!v.current.present,isGuest:!!v.current.isGuest,left:!!v.current.left,drinks:{...(v.current.drinks||{})}}),name:v.name,strafen:E,updatedAt:G()},{merge:!0});}if(!R.repeat&&window.KCGameStopwatch){let v=KCGameStopwatch.advance(r,C,k,{at:a,newRound:e.action==="start"});v!==void 0&&(k.stopwatch=v);}let y=e.action==="undo"&&C.finished&&!k.finished?(h.strafenHistory||[]).filter(v=>v.id!=="game_result_"+r+"_"+C.id):h.strafenHistory,b=((_window$KCGameResults2=window.KCGameResults)===null||_window$KCGameResults2===void 0?void 0:_window$KCGameResults2.append(y,r,k,{now:g,groups:h.groupSettings||{},server:!0,catalog:h.STRAFEN||[]}))||h.strafenHistory||[];if(!R.repeat){k.receipts=[...(k.receipts||[]),{id:e.opId,changes:V.changes}].slice(-64);let v=new Set(V.removed);_=[...(h.penaltyStatsLog||[]).filter(w=>!v.has(w.id)),...V.added];let E=window.KCGameFinePolicy?window.KCGameFinePolicy.applyTotals((h.persons||[]).map(w=>{let J=ne.find(ae=>ae.name===w.name);return J?{...w,strafen:J.finalValues}:w;}),{...h,[s]:k,strafenHistory:b,currentEveningStartedAt:T},h):null;c.set(o,{[s]:k,...(E?{persons:E}:{}),currentEveningStartedAt:T,dashboardActiveGame:r,penaltyStatsLog:_,strafenHistory:b,updatedAt:G()},{merge:!0});}return{gameResultsHistory:b.filter(v=>v.serverGameResult),state:k,eveningStartedAt:f||k.eveningStartedAt,counters:I,added:V.added,removed:V.removed,gameStats:_.filter(v=>v.tableGameId),repeat:R.repeat};});},async transactIndividualGame(n,e={},t=null){var _window$KCSharedClock14,_window$KCGameStopwat3;if(e.gameKey==="ballermann"&&(_window$KCSharedClock14=window.KCSharedClock)!==null&&_window$KCSharedClock14!==void 0&&_window$KCSharedClock14.enabled&&!(await KCSharedClock.useClub(n)))throw Error("Zeitabgleich nicht erreichbar. Bitte erneut versuchen.");let r=e.gameKey;if(!["siebener","hindernis","bergundtal","ballermann","lattenzaun","guterschnitt","parteienspiel","dreieuro","ebbeflut","hochsprung","poker","pfaelzer","tausend"].includes(r))throw new Error("Unbekanntes Spiel");let s=r+"State",o=["siebener","hindernis"].includes(r)?window.KCIndividual:window.KCExtraGames;if(!n||!o)throw new Error("Spiel ist noch nicht verf\xFCgbar");let a=O(D,"clubs",n,"state","current"),c=(_window$KCGameStopwat3=window.KCGameStopwatch)===null||_window$KCGameStopwat3===void 0?void 0:_window$KCGameStopwat3.now();return(typeof M=="function"?M.bind(null,n,t):H)(D,async l=>{var _f$s,_f$s2,_f$s3,_window$KCSharedClock15,_window$KCSharedClock16,_f$s4,_window$KCGameOptions4,_window$KCGameResults3;let h=await l.get(a),f=h.exists()?h.data():{},p=String(f.currentEveningStartedAt||((_f$s=f[s])===null||_f$s===void 0?void 0:_f$s.eveningStartedAt)||""),g=e.action==="start"&&!e.eveningStartedAt&&((_f$s2=f[s])===null||_f$s2===void 0?void 0:_f$s2.eveningStartedAt)===p&&((_f$s3=f[s])===null||_f$s3===void 0||(_f$s3=_f$s3.commands)===null||_f$s3===void 0?void 0:_f$s3.includes(e.opId));if(String(e.eveningStartedAt||"")!==p&&!g)throw new Error("Der Kegelabend wurde inzwischen gewechselt");let T=new Date(o===window.KCExtraGames?(_window$KCSharedClock15=(_window$KCSharedClock16=window.KCSharedClock)===null||_window$KCSharedClock16===void 0?void 0:_window$KCSharedClock16.now())!==null&&_window$KCSharedClock15!==void 0?_window$KCSharedClock15:Date.now():e.now||Date.now()).toISOString(),C=p||T,A=((_f$s4=f[s])===null||_f$s4===void 0?void 0:_f$s4.eveningStartedAt)===p?f[s]:o.empty(r),R={people:Array.isArray(f.persons)?f.persons:[],catalog:f.STRAFEN||[],now:T,eveningStartedAt:C,club:e.clubName||n,groups:f.groupSettings||{}},V,k;e.action==="start"&&(e={...(window.KCKranzPolicy?KCKranzPolicy.startRequest(f,r,e):e),onTop:e.onTop===!0&&((_window$KCGameOptions4=window.KCGameOptions)===null||_window$KCGameOptions4===void 0?void 0:_window$KCGameOptions4.eligible(f.gameOptions,r))===!0});try{V=o.command(A,e,R),k=V.repeat?{changes:[],added:[],removed:[]}:o.effects(A,V.state,e,R);}catch(E){throw E.code="individual-game-rejected",E;}let F=V.state;if(e.action==="start"&&Object.assign(F,{gameFineFrozen:!0,onTop:e.onTop===!0,gameFineOnTop:e.onTop===!0}),F.gameFineFrozen)for(let E of k.moneyAdded||[])Object.assign(E,{gameFineFrozen:!0,onTop:F.onTop===!0});let Y=V.repeat?(F.receipts||[]).find(E=>E.id===e.opId):null,z=V.repeat?(Y===null||Y===void 0?void 0:Y.changes)||[]:k.changes,ne=new Map();for(let E of z){let w=this.getLivePersonId(E.personName);ne.has(w)||ne.set(w,{name:E.personName,changes:[]}),ne.get(w).changes.push(E);}let I=await Promise.all([...ne].map(async([E,w])=>{let J=O(D,"clubs",n,"livePersons",E),ae=await l.get(J),_e=R.people.find(Ue=>Ue.name===w.name)||{};return{...w,ref:J,current:ae.exists()?ae.data():_e,exists:ae.exists()};})),_=[],y=f.penaltyStatsLog||[];for(let E of I){let w={...(E.current.strafen||{})};for(let J of E.changes){let ae=Number(w[J.key]||0)+(V.repeat?0:J.delta);if(!Number.isSafeInteger(ae)||ae<0)throw new Error("Strafz\xE4hler wurde inzwischen ge\xE4ndert. R\xFCckg\xE4ngig nicht m\xF6glich.");w[J.key]=ae,_.push({personName:E.name,category:"strafen",key:J.key,value:ae});}E.finalValues=w,V.repeat||l.set(E.ref,{...(E.exists?{}:{present:!!E.current.present,isGuest:!!E.current.isGuest,left:!!E.current.left,drinks:{...(E.current.drinks||{})}}),name:E.name,strafen:w,updatedAt:G()},{merge:!0});}let b=e.action==="undo"&&A.finished&&!F.finished?(f.strafenHistory||[]).filter(E=>E.id!=="game_result_"+r+"_"+A.id):f.strafenHistory;if(!V.repeat&&window.KCGameStopwatch){let E=KCGameStopwatch.advance(r,A,F,{at:c,newRound:e.action==="start"});E!==void 0&&(F.stopwatch=E);}let v=((_window$KCGameResults3=window.KCGameResults)===null||_window$KCGameResults3===void 0?void 0:_window$KCGameResults3.append(b,r,F,{now:T,groups:f.groupSettings||{},server:!0,catalog:f.STRAFEN||[]}))||f.strafenHistory||[];if(!V.repeat){F.receipts=[...(F.receipts||[]),{id:e.opId,changes:k.changes}].slice(-64);let E=new Set(k.removed);y=[...(f.penaltyStatsLog||[]).filter(_e=>!E.has(_e.id)),...k.added];let w=new Set(k.moneyRemoved),J=[...(f.individualGameLedger||[]).filter(_e=>!w.has(_e.id)),...k.moneyAdded],ae=(f.persons||[]).map(_e=>{let Ue=J.filter(je=>je.eveningStartedAt===C&&String(je.personName).trim().toLocaleLowerCase("de")===String(_e.name).trim().toLocaleLowerCase("de")).reduce((je,Dr)=>je+Dr.amountCents,0),dt=I.find(je=>je.name===_e.name);return window.KCGameFinePolicy?{..._e,...(dt?{strafen:dt.finalValues}:{}),individualChargeCents:Ue}:{..._e,strafTotal:Math.round(((Number(_e.strafTotal)||0)-(Number(_e.individualChargeCents)||0)/100+Ue/100)*100)/100,individualChargeCents:Ue};});window.KCGameFinePolicy&&(ae=window.KCGameFinePolicy.applyTotals(ae,{...f,[s]:F,individualGameLedger:J,currentEveningStartedAt:C,strafenHistory:v},f)),l.set(a,{[s]:F,persons:ae,individualGameLedger:J,individualGameRevision:(Number(f.individualGameRevision)||0)+1,currentEveningStartedAt:C,dashboardActiveGame:r,penaltyStatsLog:y,strafenHistory:v,updatedAt:G()},{merge:!0});}return{gameResultsHistory:v.filter(E=>E.serverGameResult),state:F,eveningStartedAt:p||F.eveningStartedAt,counters:_,added:k.added,removed:k.removed,ledger:V.repeat?f.individualGameLedger||[]:[...(f.individualGameLedger||[]).filter(E=>!new Set(k.moneyRemoved).has(E.id)),...k.moneyAdded],individualGameRevision:(Number(f.individualGameRevision)||0)+(V.repeat?0:1),gameStats:y.filter(E=>E.individualGameId),repeat:V.repeat};});},getLiveGameRef(n,e){if(!n)throw new Error("Club-ID fehlt");let t=Qs(e);return O(D,"clubs",n,"liveGames",t);},async loadLiveGameState(n,e){let t=this.getLiveGameRef(n,e),r=await Nn(t);return r.exists()?ic(e,r.data()):null;},async saveLiveGameState(n,e,t={},r={},s=null){let o=Qs(e),a=this.getLiveGameRef(n,o),c=Pt(t||{}),l=String(r.updatedClientId||""),h=Number(r.updatedClientAt||Date.now())||Date.now();return(typeof M=="function"?M.bind(null,n,s):H)(D,async f=>{let p=await f.get(O(D,"clubs",n,"state","current")),g=p.exists()?p.data():{};if(g.eveningResetRevision&&r.eveningStartedAt!==g.currentEveningStartedAt)throw Error("Der Kegelabend wurde inzwischen gewechselt");let T=await f.get(a),C=T.exists()?T.data():{},R=Math.max(0,parseInt(C.revision||0,10)||0)+1,V={gameKey:o,state:c,revision:R,updatedClientId:l,updatedClientAt:h,updatedAt:G()};return T.exists()||(V.createdAt=G()),f.set(a,V),{gameKey:o,state:c,revision:R,updatedClientId:l,updatedClientAt:h};});},subscribeToLiveGameState(n,e,t,r){if(typeof t!="function")throw new Error("Live-Spiel-Callback fehlt");let s=this.getLiveGameRef(n,e);return De(s,o=>{if(!o.exists()){t(null);return;}t(ic(e,o.data()));},o=>{console.error("Live-Spiel \"".concat(e,"\" konnte nicht abonniert werden:"),o),typeof r=="function"&&r(o);});},async resetLiveGameState(n,e,t={},r={},s=null){var _window$KCSharedSync;return(((_window$KCSharedSync=window.KCSharedSync)===null||_window$KCSharedSync===void 0?void 0:_window$KCSharedSync.originalApi)||this).saveLiveGameState.call(this,n,e,t,{...r,updatedClientAt:Number(r.updatedClientAt||Date.now())||Date.now()},s);},async deleteLiveGameState(n,e,t=null){let r=this.getLiveGameRef(n,e);return await(typeof kn=="function"?kn.bind(null,n,t):Pr)(r),!0;},async runLiveGameTransaction(n,e,t,r={},s=null){if(typeof t!="function")throw new Error("Transaktionsfunktion fehlt");let o=Qs(e),a=this.getLiveGameRef(n,o),c=String(r.updatedClientId||""),l=Number(r.updatedClientAt||Date.now())||Date.now();return(typeof M=="function"?M.bind(null,n,s):H)(D,async h=>{var _A$result,_A$result2;let f=await h.get(O(D,"clubs",n,"state","current")),p=f.exists()?f.data():{};if(p.eveningResetRevision&&r.eveningStartedAt!==p.currentEveningStartedAt)throw Error("Der Kegelabend wurde inzwischen gewechselt");let g=await h.get(a),T=g.exists()?g.data():{},C=g.exists()?ic(o,T):{gameKey:o,state:{},revision:0,updatedClientId:"",updatedClientAt:0,updatedAt:null,createdAt:null},A=await t({gameKey:o,state:Pt(C.state||{}),revision:C.revision,document:C,exists:g.exists()});if(!A||A.abort)return{committed:!1,reason:(A===null||A===void 0?void 0:A.reason)||"aborted",state:C.state,revision:C.revision,result:(_A$result=A===null||A===void 0?void 0:A.result)!==null&&_A$result!==void 0?_A$result:null};if(!A.state||typeof A.state!="object")throw new Error("Transaktion f\xFCr \"".concat(o,"\" liefert keinen g\xFCltigen State"));let R=Pt(A.state),V=C.revision+1,k={gameKey:o,state:R,revision:V,updatedClientId:c,updatedClientAt:l,updatedAt:G()};return g.exists()||(k.createdAt=G()),h.set(a,k),{committed:!0,gameKey:o,state:R,revision:V,updatedClientId:c,updatedClientAt:l,result:(_A$result2=A.result)!==null&&_A$result2!==void 0?_A$result2:null};});},async loadLiveLotterie(n){let e=O(D,"clubs",n,"liveGames","lotterie"),t=await Nn(e);return t.exists()?t.data():null;},async saveLiveLotterie(n,e={},t=typeof currentEveningStartedAt>"u"?"":currentEveningStartedAt,r=null){let s=O(D,"clubs",n,"liveGames","lotterie");return(typeof M=="function"?M.bind(null,n,r):H)(D,async o=>{let a=await o.get(O(D,"clubs",n,"state","current")),c=a.exists()?a.data():{};if(c.eveningResetRevision&&t!==c.currentEveningStartedAt)throw Error("Der Kegelabend wurde inzwischen gewechselt");let l=await o.get(s),h=l.exists()?l.data():{};o.set(s,{gameKey:"lotterie",state:Pt({...e,eveningStartedAt:t}),revision:(Number(h.revision)||0)+1,updatedClientId:typeof CLIENT_ID<"u"?CLIENT_ID:"lotterie",updatedClientAt:Date.now(),updatedAt:G()});});},async changeLiveLotterieThrow(n,e,t,r,s=null,o=typeof currentEveningStartedAt>"u"?"":currentEveningStartedAt,a=null){let c=O(D,"clubs",n,"liveGames","lotterie");return(typeof M=="function"?M.bind(null,n,a):H)(D,async l=>{let h=await l.get(O(D,"clubs",n,"state","current")),f=h.exists()?h.data():{};if(f.eveningResetRevision&&o!==f.currentEveningStartedAt)throw Error("Der Kegelabend wurde inzwischen gewechselt");let p=await l.get(c),g=p.exists()?p.data():{},T=g.state&&typeof g.state=="object"?g.state:{},C={...(T.throws||g.throws||{})},A={...(T.throwMeta||g.throwMeta||{})},R=Array.isArray(C[e])?[...C[e]]:[],V=Array.isArray(A[e])?[...A[e]]:[];return R[t]=r,V[t]=s||null,C[e]=R,A[e]=V,l.set(c,{state:{...T,throws:C,throwMeta:A},revision:(Number(g.revision)||0)+1,updatedClientId:"lotterie-throw",updatedClientAt:Date.now(),updatedAt:G()},{merge:!0}),{value:r,throwMeta:s||null};});},subscribeToLiveLotterie(n,e,t){let r=O(D,"clubs",n,"liveGames","lotterie");return De(r,s=>{e(s.exists()?s.data():null);},t);},async saveSeatingLive(n,e,t=null){let r=O(D,"clubs",n,"live","seating");await(typeof Ye=="function"?Ye.bind(null,n,t):qt)(r,{...e,updatedAt:G()});},subscribeToSeatingLive(n,e,t){let r=O(D,"clubs",n,"live","seating");return De(r,s=>e(s.exists()?s.data():null),t);},subscribeToClubState(n,e,t){window.KCSharedClock&&KCSharedClock.useClub(n);let r=O(D,"clubs",n,"state","current"),s=o=>{var _o$metadata,_o$metadata2;return e(o.exists()?o.data():null,{fromCache:((_o$metadata=o.metadata)===null||_o$metadata===void 0?void 0:_o$metadata.fromCache)===!0,pending:((_o$metadata2=o.metadata)===null||_o$metadata2===void 0?void 0:_o$metadata2.hasPendingWrites)===!0});};return window.KCSharedSync||window.KCSharedTransport?De(r,{includeMetadataChanges:!0},s,t):De(r,s,t);},async archiveClubEvent(n,e,t={},r=null){let s=O(D,"clubs",n,"archive",e);await(typeof Ye=="function"?Ye.bind(null,n,r):qt)(s,{...t,updatedAt:G()},{merge:!0});},async listCashBookEntries(n){return(await Rr(Xe(D,"clubs",n,"archive"))).docs.map(t=>({...t.data(),id:t.id})).filter(t=>["strafen","expense","getraenke"].includes(t.category)).sort((t,r)=>String(r.closedAt||r.date||"").localeCompare(String(t.closedAt||t.date||"")));},subscribeCashBookEntries(n,e,t){return De(Xe(D,"clubs",n,"archive"),r=>e(r.docs.map(s=>({...s.data(),id:s.id})).filter(s=>["strafen","expense","getraenke"].includes(s.category)).sort((s,o)=>String(o.closedAt||o.date||"").localeCompare(String(s.closedAt||s.date||"")))),t);},async saveStrafenClosure(n,e,t,r=null,s=null){if(!n||typeof e!="string"||!/^strafen_abend_[a-zA-Z0-9_-]+$/.test(e))throw new Error("Ung\xFCltiger Kegelabend");if(t.category!=="strafen"||!Number.isSafeInteger(t.laneCostCents)||t.laneCostCents<0)throw new Error("Ung\xFCltige Bahngeb\xFChr");let o=O(D,"clubs",n,"archive",e);return(typeof M=="function"?M.bind(null,n,s):H)(D,async a=>{let c=await a.get(o),l=c.exists()?c.data():{};if(c.exists()&&(l.category!=="strafen"||r===null||(l.ledgerRevision||0)!==r))throw new Error("Abschluss wurde inzwischen ge\xE4ndert. Bitte erneut \xF6ffnen.");if(!c.exists()&&r!==null)throw new Error("Abschluss wurde inzwischen gel\xF6scht. Bitte erneut \xF6ffnen.");let h=(l.ledgerRevision||0)+1;return a.set(o,{...l,...t,ledgerRevision:h,updatedAt:G()}),h;});},async saveCashExpense(n,e,t,r=null,s=null){if(!n||typeof e!="string"||!/^expense_manual_[a-zA-Z0-9_-]+$/.test(e))throw new Error("Ung\xFCltige Ausgabe");if(!Number.isSafeInteger(t.amountCents)||t.amountCents<=0||!String(t.description||"").trim()||String(t.description).length>120||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date+"T12:00:00Z"))||new Date(t.date+"T12:00:00Z").toISOString().slice(0,10)!==t.date||!Number.isFinite(Date.parse(t.incurredAt)))throw new Error("Ung\xFCltige Ausgabedaten");let o=O(D,"clubs",n,"archive",e);return(typeof M=="function"?M.bind(null,n,s):H)(D,async a=>{let c=await a.get(o),l=c.exists()?c.data():{};if(c.exists()&&(l.category!=="expense"||r===null||(l.ledgerRevision||0)!==r))throw new Error("Ausgabe wurde inzwischen ge\xE4ndert. Bitte erneut \xF6ffnen.");if(!c.exists()&&r!==null)throw new Error("Ausgabe wurde inzwischen gel\xF6scht. Bitte erneut \xF6ffnen.");let h=(l.ledgerRevision||0)+1;return a.set(o,{category:"expense",type:"manual",description:String(t.description).trim(),date:t.date,incurredAt:t.incurredAt,amountCents:t.amountCents,ledgerRevision:h,updatedAt:G()}),h;});},async updateLaneExpense(n,e,t,r,s=null){if(!n||typeof e!="string"||!e||e.includes("/"))throw new Error("Ung\xFCltiger Kegelabend");if(!t.remove&&(!Number.isSafeInteger(t.amountCents)||t.amountCents<0||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date+"T12:00:00Z"))||new Date(t.date+"T12:00:00Z").toISOString().slice(0,10)!==t.date||!Number.isFinite(Date.parse(t.incurredAt))))throw new Error("Ung\xFCltige Bahngeb\xFChr");let o=O(D,"clubs",n,"archive",e);return(typeof M=="function"?M.bind(null,n,s):H)(D,async a=>{let c=await a.get(o);if(!c.exists())throw new Error("Kegelabend wurde inzwischen gel\xF6scht");let l=c.data();if(l.category!=="strafen"||!Number.isSafeInteger(l.laneCostCents))throw new Error("Eintrag enth\xE4lt keine Bahngeb\xFChr");if((l.ledgerRevision||0)!==r)throw new Error("Ausgabe wurde inzwischen ge\xE4ndert. Bitte erneut \xF6ffnen.");let h=t.remove?{laneExpenseExcluded:!0}:{laneCostCents:t.amountCents,laneExpenseDate:t.date,laneExpenseIncurredAt:t.incurredAt,laneExpenseExcluded:!1};l.manualDraft&&(h.manualDraft={...l.manualDraft,laneFee:((t.remove?l.laneCostCents:t.amountCents)/100).toFixed(2),laneExpenseExcluded:!!t.remove},h.manualRevision=(l.manualRevision||0)+1),a.set(o,{...l,...h,ledgerRevision:(l.ledgerRevision||0)+1,updatedAt:G()});});},async deleteCashExpense(n,e,t,r=null){if(!n||typeof e!="string"||!/^expense_manual_[a-zA-Z0-9_-]+$/.test(e))throw new Error("Ung\xFCltige Ausgabe");let s=O(D,"clubs",n,"archive",e);return(typeof M=="function"?M.bind(null,n,r):H)(D,async o=>{let a=await o.get(s);if(!a.exists())throw new Error("Ausgabe wurde inzwischen gel\xF6scht");let c=a.data();if(c.category!=="expense"||(c.ledgerRevision||0)!==t)throw new Error("Ausgabe wurde inzwischen ge\xE4ndert. Bitte aktualisieren.");o.delete(s);});},async listArchivedStrafenEvents(n){let e=Xe(D,"clubs",n,"archive");return(await Rr(e)).docs.map(r=>({...r.data(),id:r.id})).filter(r=>r.category==="strafen").sort((r,s)=>String(s.closedAt||s.date||"").localeCompare(String(r.closedAt||r.date||"")));},async deleteArchivedStrafenEvent(n,e,t=null,r=null){if(!n||typeof e!="string"||!e||e.includes("/")||e==="."||e===".."||e.length>1500)throw new Error("Ung\xFCltiger Archiv-Eintrag");let s=O(D,"clubs",n,"archive",e);if(typeof M=="function"&&r)return M(n,r,D,async a=>{let c=await a.get(s);if(!c.exists())throw Error("Abschluss ist nicht mehr vorhanden");let l=c.data();if(l.category!=="strafen")throw Error("Eintrag ist kein Strafenabschluss");if(t===null||(Number(l.ledgerRevision)||0)!==t)throw Error("Abschluss wurde inzwischen ge\xE4ndert. Bitte erneut pr\xFCfen.");a.delete(s);});let o=await Nn(s);if(!o.exists())throw new Error("Abschluss ist nicht mehr vorhanden");if(o.data().category!=="strafen")throw new Error("Eintrag ist kein Strafenabschluss");await(typeof kn=="function"?kn.bind(null,n,r):Pr)(s);},subscribeArchivedStrafenEvents(n,e,t){return De(Xe(D,"clubs",n,"archive"),r=>e(r.docs.map(s=>({...s.data(),id:s.id})).filter(s=>s.category==="strafen").sort((s,o)=>String(o.closedAt||o.date||"").localeCompare(String(s.closedAt||s.date||"")))),t);},async loadArchivedStrafenEvent(n,e){if(!n||typeof e!="string"||!e||e.includes("/"))throw new Error("Ung\xFCltiger Archiv-Eintrag");let t=await Nn(O(D,"clubs",n,"archive",e));if(!t.exists())return null;let r=t.data();if(r.category!=="strafen")throw new Error("Eintrag ist kein Strafenabschluss");return{...r,id:t.id};},async saveHistoricalStrafenEvent(n,e,t,r=null,s=e,o=null){if(!n||typeof e!="string"||!/^cancelled_\d{4}-\d{2}-\d{2}$|^strafen_nachtrag_[a-zA-Z0-9_-]+$/.test(e))throw new Error("Ung\xFCltiger Nachtrag");if(t.category!=="strafen"||!["cancelled","backfill"].includes(t.kind))throw new Error("Ung\xFCltige Abrechnung");if(t.laneCostCents!=null&&(!Number.isSafeInteger(t.laneCostCents)||t.laneCostCents<0||t.kind==="cancelled"))throw new Error("Ung\xFCltige Bahngeb\xFChr");if(s!==e&&(t.kind!=="cancelled"||!/^cancelled_\d{4}-\d{2}-\d{2}$/.test(s)))throw new Error("Ung\xFCltiger urspr\xFCnglicher Ausfalltermin");let a=O(D,"clubs",n,"archive",e),c=s===e?a:O(D,"clubs",n,"archive",s);return(typeof M=="function"?M.bind(null,n,o):H)(D,async l=>{let h=await l.get(c);if(h.exists()){let p=h.data();if(p.category!=="strafen")throw new Error("Eintrag ist kein Strafenabschluss");if(r===null||(p.manualRevision||0)!==r)throw new Error("Eintrag wurde inzwischen ge\xE4ndert. Bitte aktualisieren und erneut \xF6ffnen.");}else if(r!==null)throw new Error("Eintrag wurde inzwischen gel\xF6scht. Bitte als neuen Nachtrag anlegen.");if(s!==e&&(await l.get(a)).exists())throw new Error("F\xFCr dieses Datum ist bereits ein Ausfalltermin gespeichert.");let f=(r||0)+1;return l.set(a,{...(h.exists()?h.data():{}),...t,manualRevision:f,ledgerRevision:((h.exists()?h.data().ledgerRevision:0)||0)+1,updatedAt:G()}),s!==e&&l.delete(c),f;});},async saveClubMeta(n,e={},t=null){let r=O(D,"clubs",n);await(typeof Ye=="function"?Ye.bind(null,n,t):qt)(r,{...e,updatedAt:G()},{merge:!0});},async loadClubList(){return(await Rr(Xe(D,"clubs"))).docs.map(e=>({id:e.id,...e.data()}));},getLivePersonId(n){return encodeURIComponent(String(n||"").trim().toLowerCase());},async loadLivePersons(n){let e=Xe(D,"clubs",n,"livePersons");return(await Rr(e)).docs.map(r=>({id:r.id,...r.data()}));},async seedLivePersons(n,e=[],t=null){return(typeof M=="function"?M.bind(null,n,t):H)(D,async r=>{let s=[];for(let o of e){if(!(o!==null&&o!==void 0&&o.name))continue;let a=O(D,"clubs",n,"livePersons",this.getLivePersonId(o.name));(await r.get(a)).exists()||s.push({target:a,person:o});}for(let o of s)r.set(o.target,{...o.person,updatedAt:G()});return!0;});},async saveLivePersonStatus(n,e,t={},r=null){if(!e)throw new Error("Personenname fehlt");let s=this.getLivePersonId(e),o=O(D,"clubs",n,"livePersons",s),c=["present","excused","unexcused","unknown"].includes(t.attendanceStatus)?t.attendanceStatus:t.present?"present":"unknown";return await(typeof Ye=="function"?Ye.bind(null,n,r):qt)(o,{name:e,isGuest:!!t.isGuest,present:!!t.present,attendanceStatus:c,left:!!t.left,tisch:t.tisch||"",arrivalTime:t.arrivalTime||"",leftAt:t.leftAt||"",leftEarlyAt:t.leftEarlyAt||"",boughtThrows:Math.max(0,parseInt(t.boughtThrows||0,10)||0),paid:Math.max(0,parseFloat(t.paid||0)||0),updatedAt:G()},{merge:!0}),!0;},async saveLivePerson(n,e,t={},r=null){if(!e)throw new Error("Personenname fehlt");let s=this.getLivePersonId(e),o=O(D,"clubs",n,"livePersons",s),c=["present","excused","unexcused","unknown"].includes(t.attendanceStatus)?t.attendanceStatus:t.present?"present":"unknown";return await(typeof M=="function"?M.bind(null,n,r):H)(D,async l=>{let h=await l.get(o),f=h.exists()?h.data():null,p=!!f&&!t.forceCounterReset,g={name:e,isGuest:!!t.isGuest,present:!!t.present,attendanceStatus:c,left:!!t.left,tisch:t.tisch||"",arrivalTime:t.arrivalTime||"",leftAt:t.leftAt||"",leftEarlyAt:t.leftEarlyAt||"",drinks:p?{...(f.drinks||{})}:{...(t.drinks||{})},strafen:p?{...(f.strafen||{})}:{...(t.strafen||{})},freeStrafen:Array.isArray(t.freeStrafen)?t.freeStrafen.map(T=>({...T})):[],rounds:Array.isArray(t.rounds)?t.rounds.map(T=>({...T,drinks:{...(T.drinks||{})}})):[],boughtThrows:Math.max(0,parseInt(t.boughtThrows||0,10)||0),paid:Math.max(0,parseFloat(t.paid||0)||0),updatedAt:G()};l.set(o,g,{merge:!0});}),!0;},async deleteLivePersonRound(n,e,t,r=null){if(!e)throw new Error("Personenname fehlt");if(!t)throw new Error("Runden-ID fehlt");let s=this.getLivePersonId(e),o=O(D,"clubs",n,"livePersons",s);return(typeof M=="function"?M.bind(null,n,r):H)(D,async a=>{let c=await a.get(o);if(!c.exists())return{deleted:!1,rounds:[]};let l=c.data(),h=Array.isArray(l.rounds)?l.rounds:[],f=h.filter(p=>p.id!==t);return a.set(o,{name:e,rounds:f,updatedAt:G()},{merge:!0}),{deleted:f.length!==h.length,rounds:f};});},async changeLivePersonBoughtThrows(n,e,t,r,s=null){if(!e)throw new Error("Personenname fehlt");let o=parseInt(t||0,10)||0,a=Math.max(0,parseInt(r||0,10)||0),c=this.getLivePersonId(e),l=O(D,"clubs",n,"livePersons",c);return(typeof M=="function"?M.bind(null,n,s):H)(D,async h=>{let f=await h.get(l),p=f.exists()?f.data():{},g=Math.max(0,parseInt(p.boughtThrows||0,10)||0),T=Math.max(0,Math.min(a,g+o));return o>0&&g>=a?{changed:!1,value:g}:(h.set(l,{name:e,boughtThrows:T,updatedAt:G()},{merge:!0}),{changed:T!==g,value:T});});},async saveLivePersonPayment(n,e,t,r=null){if(!e)throw new Error("Personenname fehlt");let s=Math.max(0,Math.round((parseFloat(t||0)||0)*100)/100),o=this.getLivePersonId(e),a=O(D,"clubs",n,"livePersons",o);return await(typeof Ye=="function"?Ye.bind(null,n,r):qt)(a,{name:e,paid:s,updatedAt:G()},{merge:!0}),{paid:s};},async addLivePersonFreeStrafe(n,e,t,r=null){if(!e)throw new Error("Personenname fehlt");if(!t||!t.id)throw new Error("Ung\xFCltiger Strafeneintrag");let s=this.getLivePersonId(e),o=O(D,"clubs",n,"livePersons",s);return(typeof M=="function"?M.bind(null,n,r):H)(D,async a=>{let c=await a.get(o),l=c.exists()?c.data():{},h=Array.isArray(l.freeStrafen)?l.freeStrafen.map(p=>({...p})):[],f=h.some(p=>p.id===t.id);return f||h.push({...t}),a.set(o,{name:e,freeStrafen:h,updatedAt:G()},{merge:!0}),{added:!f,freeStrafen:h};});},async addLivePersonRound(n,e,t,r=null){if(!e)throw new Error("Personenname fehlt");if(!t||!t.id)throw new Error("Ung\xFCltiger Rundeneintrag");let s=this.getLivePersonId(e),o=O(D,"clubs",n,"livePersons",s);return(typeof M=="function"?M.bind(null,n,r):H)(D,async a=>{let c=await a.get(o),l=c.exists()?c.data():{},h=Array.isArray(l.rounds)?l.rounds.map(p=>({...p,drinks:{...(p.drinks||{})}})):[],f=h.some(p=>p.id===t.id);return f||h.push({...t,drinks:{...(t.drinks||{})}}),a.set(o,{name:e,rounds:h,updatedAt:G()},{merge:!0}),{added:!f,rounds:h};});},async deleteLivePersonFreeStrafe(n,e,t,r=null){if(!e)throw new Error("Personenname fehlt");if(!t)throw new Error("Strafen-ID fehlt");let s=this.getLivePersonId(e),o=O(D,"clubs",n,"livePersons",s);return(typeof M=="function"?M.bind(null,n,r):H)(D,async a=>{let c=await a.get(o);if(!c.exists())return{deleted:!1,freeStrafen:[]};let l=c.data(),h=Array.isArray(l.freeStrafen)?l.freeStrafen:[],f=h.filter(p=>p.id!==t);return a.set(o,{name:e,freeStrafen:f,updatedAt:G()},{merge:!0}),{deleted:f.length!==h.length,freeStrafen:f};});},async deleteLivePerson(n,e,t=null){if(!e)throw new Error("Personenname fehlt");let r=this.getLivePersonId(e),s=O(D,"clubs",n,"livePersons",r);return await(typeof kn=="function"?kn.bind(null,n,t):Pr)(s),!0;},async changeLivePersonCounter(n,e,t,r,s,o=null){if(!["drinks","strafen"].includes(t))throw new Error("Ung\xFCltige Kategorie: ".concat(t));if(!e)throw new Error("Personenname fehlt");if(!r)throw new Error("Z\xE4hlerschl\xFCssel fehlt");let a=this.getLivePersonId(e),c=O(D,"clubs",n,"livePersons",a);return(typeof M=="function"?M.bind(null,n,o):H)(D,async l=>{let h=await l.get(c),p={...((h.exists()?h.data():{})[t]||{})},g=Number(p[r]||0),T=Math.max(0,g+Number(s||0));return p[r]=T,l.set(c,{name:e,[t]:p,updatedAt:G()},{merge:!0}),T;});},async changeMultipleLivePersonCounters(n,e=[],t=null){let r=e.filter(s=>s&&s.personName&&["drinks","strafen"].includes(s.category)&&s.key&&Number(s.delta||0)!==0);return r.length?(typeof M=="function"?M.bind(null,n,t):H)(D,async s=>{let o=new Map();r.forEach(l=>{let h=this.getLivePersonId(l.personName);o.has(h)||o.set(h,{personId:h,personName:l.personName,changes:[]}),o.get(h).changes.push(l);});let a=await Promise.all([...o.values()].map(async l=>{let h=O(D,"clubs",n,"livePersons",l.personId),f=await s.get(h);return{...l,personRef:h,current:f.exists()?f.data():{}};})),c=[];return a.forEach(l=>{let h={name:l.personName,drinks:{...(l.current.drinks||{})},strafen:{...(l.current.strafen||{})},updatedAt:G()};l.changes.forEach(f=>{let p=h[f.category],g=Number(p[f.key]||0),T=Math.max(0,g+Number(f.delta||0));p[f.key]=T,c.push({personName:f.personName,category:f.category,key:f.key,value:T});}),s.set(l.personRef,h,{merge:!0});}),c;}):[];},subscribeToLivePersons(n,e,t){let r=Xe(D,"clubs",n,"livePersons");return De(r,s=>{let o=s.docChanges().map(a=>({type:a.type,id:a.doc.id,data:a.doc.data()}));e(o);},t);}};window.firestoreApi.__syncArity={processDrinkStationCommand:2,closeDrinkStationEvening:1,setGameStopwatch:2,ensureCashStandingIncome:2,updateCashIncome:2,commitTabletBatch:2,cancelGame:2,startNewEvening:2,saveClubState:2,updateClubCalendar:2,setDashboardGameOverview:2,updateGameOptions:2,drawRandomGame:2,updateGameFineSettings:2,updateClubContent:2,setClubContentDashboard:2,setCashDashboardView:2,updateCashStandingOrders:2,setDashboardRules:2,updatePenaltyStatsSettings:2,transactSechsGame:2,transactTableGame:2,transactIndividualGame:2,saveLiveGameState:4,resetLiveGameState:4,deleteLiveGameState:2,runLiveGameTransaction:4,saveLiveLotterie:3,changeLiveLotterieThrow:6,saveSeatingLive:2,archiveClubEvent:3,saveStrafenClosure:4,saveCashExpense:4,updateLaneExpense:4,deleteCashExpense:3,deleteArchivedStrafenEvent:3,saveHistoricalStrafenEvent:5,saveClubMeta:2,seedLivePersons:2,saveLivePersonStatus:3,saveLivePerson:3,deleteLivePersonRound:3,changeLivePersonBoughtThrows:4,saveLivePersonPayment:3,addLivePersonFreeStrafe:3,addLivePersonRound:3,deleteLivePersonFreeStrafe:3,deleteLivePerson:2,changeLivePersonCounter:5,changeMultipleLivePersonCounters:2};(_window$KCSharedSync2=window.KCSharedSync)===null||_window$KCSharedSync2===void 0||_window$KCSharedSync2.install(window.firestoreApi);console.log("Firestore API bereit");async function sp(){try{var _window$KCTabletAuth,_window;await((_window$KCTabletAuth=(_window=window).KCTabletAuth)===null||_window$KCTabletAuth===void 0?void 0:_window$KCTabletAuth.call(_window));}catch(n){console.warn("Firebase-Anmeldestatus noch nicht verf\xFCgbar:",(n===null||n===void 0?void 0:n.code)||(n===null||n===void 0?void 0:n.message));}return startApp();}typeof startApp=="function"&&sp();})();};
