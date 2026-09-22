window.SPRITE_FP_B64=window.SPRITE_FP_B64||{};
(function(){
  var files=['Jonesy','Bush','Adventure','8-Bit','Sonic','Tails','Shadow','Killswitch','Jackrabbit','Klombo','Crown','Storm-Scout','Pond','Crash','Blinky','Dumpster-Dive'];
  function decode(){
    var src=window.SPRITE_FP_B64||{}, db={};
    function dec(s){
      var bin=atob(s), n=bin.length, vec=new Float32Array(n);
      for(var i=0;i<n;i++) vec[i]=bin.charCodeAt(i)/255;
      return vec;
    }
    Object.keys(src).forEach(function(k){ db[k]={fp:dec(src[k])}; });
    window.SPRITE_FP=db;
  }
  var left=files.length;
  if(!left){decode();return;}
  files.forEach(function(name){
    var s=document.createElement('script');
    s.src='fp/'+name+'.js?v=20260922e';
    s.onload=s.onerror=function(){ if(--left<=0) decode(); };
    document.head.appendChild(s);
  });
})();
