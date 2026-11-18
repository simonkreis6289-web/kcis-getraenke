/* DOM and Web Crypto primitives required by dashboard scripts on older TV engines. */
(function(){
  if(!Element.prototype.replaceChildren){
    Element.prototype.replaceChildren=function(...children){
      while(this.firstChild)this.removeChild(this.firstChild);
      this.append(...children);
    };
  }
  if(!Element.prototype.toggleAttribute){
    Element.prototype.toggleAttribute=function(name,enabled){
      const present=arguments.length===2?Boolean(enabled):!this.hasAttribute(name);
      if(present)this.setAttribute(name,'');else this.removeAttribute(name);
      return present;
    };
  }
  if(window.crypto&&!window.crypto.randomUUID&&window.crypto.getRandomValues){
    window.crypto.randomUUID=function(){
      const bytes=this.getRandomValues(new Uint8Array(16));
      bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
      const hex=Array.from(bytes,byte=>('0'+byte.toString(16)).slice(-2)).join('');
      return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
    };
  }
})();
