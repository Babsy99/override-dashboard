window.SPRITE_FP_B64=window.SPRITE_FP_B64||{};
(function(){
  var src=window.SPRITE_FP_B64||{};
  var db={};
  function dec(s){
    var bin=atob(s),n=bin.length,vec=new Float32Array(n);
    for(var i=0;i<n;i++) vec[i]=bin.charCodeAt(i)/255;
    return vec;
  }
  Object.keys(src).forEach(function(k){ db[k]={fp:dec(src[k])}; });
  window.SPRITE_FP=db;
})();
