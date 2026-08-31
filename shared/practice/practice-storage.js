import {createEmptyPracticeState,migratePracticeState,normalizePracticeState} from './practice-state.js';

export class LocalStoragePracticeStorage{
  constructor({key,storage=globalThis.localStorage,now=()=>new Date().toISOString()}={}){
    if(!key)throw new TypeError('Practice storage key is required');
    this.key=key;this.storage=storage;this.now=now;this.available=Boolean(storage);this.lastError=null;this.recovered=false;
  }
  load(){
    if(!this.storage){this.available=false;return createEmptyPracticeState(this.now);}
    try{
      const raw=this.storage.getItem(this.key);
      if(!raw)return createEmptyPracticeState(this.now);
      try{return migratePracticeState(JSON.parse(raw),this.now);}
      catch(error){this.recovered=true;this.lastError=error;return createEmptyPracticeState(this.now);}
    }catch(error){this.available=false;this.lastError=error;return createEmptyPracticeState(this.now);}
  }
  save(state){
    if(!this.storage){this.available=false;return false;}
    try{this.storage.setItem(this.key,JSON.stringify(normalizePracticeState(state,this.now)));this.available=true;this.lastError=null;return true;}
    catch(error){this.available=false;this.lastError=error;return false;}
  }
  clear(){
    if(!this.storage)return false;
    try{this.storage.removeItem(this.key);return true;}catch(error){this.available=false;this.lastError=error;return false;}
  }
  diagnostics(){return {available:this.available,recovered:this.recovered,error:this.lastError?.name||null,key:this.key};}
}

export class MemoryPracticeStorage{
  constructor(state=null,now=()=>new Date().toISOString()){this.state=state;this.now=now;this.available=true;}
  load(){return this.state?normalizePracticeState(this.state,this.now):createEmptyPracticeState(this.now);}
  save(state){this.state=normalizePracticeState(state,this.now);return true;}
  clear(){this.state=null;return true;}
  diagnostics(){return {available:true,recovered:false,error:null,key:null};}
}
