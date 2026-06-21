// Library for access to the system and device features.
//

//
// These are some definitions for older versions of Android
//
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.lastIndexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
  };
}
if(!document.dispatchCustomEvent) {
  document.dispatchCustomEvent = function(event) {
    function visit(elem,event) {
      elem.dispatchEvent(event);
      var child = elem.firstChild;
      while(child) {
        if(child.nodeType==1) visit(child,event);
        child = child.nextSibling;
      }
    }
    document.dispatchEvent(event);
    visit(document.documentElement,event);
  }
}

if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) { // .length of function is 2
      'use strict';
      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

(function () {
  if ( typeof window.CustomEvent === "function" ) return false;
  function CustomEvent ( event, params ) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
   }
  CustomEvent.prototype = window.Event.prototype;
  window.CustomEvent = CustomEvent;
})();

var eventCounter = 0;

function makeEventName(prefix) {
  return prefix + "" + (eventCounter++);
}


//
// android object incorporates all other objects and functions defined in this file.
//
var android = (function(global) {
  var ifs = {
    files : global._JSFiles_,
    webView : global._JSWebView_,
    activity : global._JSActivity_,
    alarm : global._JSAlarm_,
    //billing : global._JSBilling_,
    bitmaps : global._JSBitmaps_,
    bitmaps4 : global._JSBitmaps4_,
    clipboard : global._JSClipboard_,
    dialog: global._JSDialog_,
    thisDialog: global._ThisDialog_,
    download : global._JSDownload_,
    location : global._JSLocation_,
    log : global._JSLog_,
    network : global._JSNetwork_,
    notification : global._JSNotification_,
    sensors : global._JSSensors_,
    toast : global._JSToast_,
    reflect : global._JSReflect_,
    vibrator : global._JSVibrator_,
    viewPager : global._JSViewPager_,
    fileProvider : global._JSFileProvider_,
    admob: global._JSAdmob_,
    firebase : global._JSFirebase_,
    googleAuth : global._JSGoogleAuth_,
  };

  function JavaObject(id) {
    this._getId = function() { return id; };

    this._keep = function(value) { ifs.reflect.keep(id,value);}
    this._forget = function() { ifs.reflect.forget(id);}

    var getField = function(name) {
      var result = JSON.parse(ifs.reflect.getField(id,name));
      if(typeof result.id === 'undefined') return result.value;
      else return new JavaObject(result.id);
    };

    var setField = function(name,value) {
      if(value instanceof JavaObject) value = JSON.stringify({id:value._getId()});
      else value = JSON.stringify({value:value});
      ifs.reflect.setField(id,name,value);
    };

    var invoke = function(name,args) {
      var params = [];
      for(var i=0; i<args.length; ++i) {
        var value = args[i];
        if(value instanceof JavaObject) value = {id:value._getId()};
        else
        if(typeof value === "undefined") value = {value:null};
        else value = {value:value};
        params[i] = value;
      }
      var result;
      result = JSON.parse(ifs.reflect.invoke(id,name,JSON.stringify(params)));
      if(result.error) {  throw new Error("Error invoking "+name+": "+result.error); }
      else
      if(typeof result.id === 'undefined') return result.value;
      else return new JavaObject(result.id);
    };

    this["class"] = ifs.reflect.getClassName(id);
    if(this["class"]==="java.lang.Class") {
      this._newInstance = function(args) {
        var params = [];
        for(var i=0; i<args.length; ++i) {
          var value = args[i];
          if(value instanceof JavaObject) value = {id:value._getId()};
          else value = {value:value};
          params[i] = value;
        }
        var result = JSON.parse(ifs.reflect.newInstance(id,JSON.stringify(params)));
        if(result.error) { throw new Error(result.error); }
        else
        if(typeof result.id === 'undefined') return result.value;
        else return new JavaObject(result.id);
      }
    }
    var fields = JSON.parse(ifs.reflect.getFieldNames(id));
    for(var i=0; i<fields.length; ++i) {
      var field = fields[i];
      try { this["get_"+field] = (function(name){ return function() { return getField(name); };})(field); } catch(e) {}
      try { this["set_"+field] = (function(name){ return function(value) { setField(name,value); }; })(field); } catch(e) {}
    }
    var methods = JSON.parse(ifs.reflect.getMethodNames(id));
    for(var i=0; i<methods.length; ++i) {
      var method = methods[i];
      try {
        this[method] = (function(name){ return function() { return invoke(name,arguments); }; })(method);
      }
      catch(e) { }
    }
  }

  var java = {
    activity: new JavaObject("activity"),
    webView: new JavaObject("webView"),
    class: new JavaObject("Class"),
  };

  var Reflect = function Reflect() {
    this.activity = new JavaObject("activity");
    this.webView = new JavaObject("webView");
    this.Class = new JavaObject("Class");

    this.newInstance = function(name,args) {
      var params = [];
      for(var i=0; i<args.length; ++i) {
        var value = args[i];
        if(value instanceof JavaObject) value = {id:value._getId()};
        else value = {value:value};
        params[i] = value;
      }
      var result = JSON.parse(ifs.reflect.newInstance(name,JSON.stringify(params)));
      if(result.error) { throw new Error(result.error); }
      else
      if(typeof result.id === 'undefined') return result.value;
      else return new JavaObject(result.id);
    };

    this.keep = function(obj,value) {
      if(obj instanceof JavaObject) {
        ifs.reflect.keep(obj._getId(),value==true);
      }
    };
  };

  var reflect = {
    getClassDeclaredFields: function(className) {
      var result = JSON.parse(ifs.reflect.getClassDeclaredFields(className));
      if(result.error) throw new Error(result.error);
      else return result.list;
    },
  };

  var Exception = function(str) {
    var data = JSON.parse(str);

  };

  var toPath = function(obj) {
    return obj?obj.toString():null;
  }

  var extendPath = function(a,b) {
    if(a=="/") return "/"+b;
    else return a+"/"+b;
  }

  var observerCount = 0;

  var File = function() {
    var path = (arguments.length==1?toPath(arguments[0]):extendPath(toPath(arguments[0]),toPath(arguments[1])));
    this.canRead = function() {
      return ifs.files.canRead(path);
    };
    this.canWrite = function() {
      return ifs.files.canWrite(path);
    };
    this.copyTo = function(file) {
      return ifs.files.copy(path,toPath(file));
    };
    this.copyFromUri = function(uri) {
      return ifs.files.copyUriToFile(uri,path);
    };
    this.append = function(data) {
      return ifs.files.append(path,data);
    };
    this.createNewFile = function() {
      try { return ifs.files.createNewFile(path); }
      catch(e) { throw new Error("Error when creating new file '"+path+"': "+ifs.files.getLastError()); }
    };
    this.delete = function() { return ifs.files.delete(path); };
    this.deleteFileOrFolder = function() {
      if(!this.exists()) return false;
      if(this.isDirectory()) {
        var list = this.listFiles();
        for(var i=0; i<list.length; ++i) {
          if(!list[i].deleteFileOrFolder()) return false;
        }
      }
      return this.delete();
    };

    this.equals = function(file) { return path==toPath(file); };
    this.exists = function() { return ifs.files.exists(path); };
    this.getName = function() {
      var idx = path.lastIndexOf("/");
      if(idx>=0) return path.substring(idx+1);
      else return path;
    };
    this.getContentUri = function() {
      return ifs.fileProvider.getContentUri(path);
    }
    this.getParent = function() {
      var idx = path.lastIndexOf("/");
      if(idx>0) return new File(path.substring(0,idx));
      else
      if(idx==0) return new File("/");
      else return null;
    };
    this.getPathRelativeTo = function(dir) {
       var p = toPath(dir);
       if(p==path) return "";
       if(p.length<path.length && path.startsWith(p+"/")) {
          return path.substring(p.length+1);
       }
       else throw new Error("Invalid dir parameter");
    }
    this.getSuffix = function() {
      var name = this.getName();
      var idx = name.lastIndexOf(".");
      if(idx>0) return name.substring(idx+1);
      else return null;
    };
    this.isDirectory = function() { return path==null?false:ifs.files.isDirectory(path); };
    this.isFile = function() { return path==null?false:ifs.files.isFile(path); };
    this.lastModified = function() { return ifs.files.lastModified(path); };
    this.length = function() { return ifs.files.length(path); };
    this.list = function() { return JSON.parse(ifs.files.list(path)); };
    this.listFiles = function() {
      var list = JSON.parse(ifs.files.list(path));
      for(var i=0; i<list.length; ++i) list[i] = new File(path,list[i]);
      return list;
    };
    this.mkdir = function() { return ifs.files.mkdir(path); };
    this.mkdirs = function() { return ifs.files.mkdirs(path); };
    this.read = function() { return ifs.files.read(path); };
    this.readBase64 = function() { return ifs.files.readBase64(path); };
    this.readHex = function(pos,len) { return ifs.files.readHex(path,pos,len); };
    this.renameTo = function(file) {
      if(file instanceof File) file = file.toString();
      return ifs.files.rename(path,file);
    };
    this.setLastModified = function(time) { ifs.files.setLastModified(time); };
    this.share = function(mimeType) {
      ifs.files.share(path,mimeType?mimeType:null);
    };
    this.startObserver = function(mask,handler) {
      handler.observerId = (++observerCount);
      var eventName = "FileObserver."+handler.observerId;
      document.addEventListener(eventName,handler);
      ifs.files.startObserver(path,mask,""+handler.observerId);
    };
    this.stopObserver = function(handler) {
      ifs.files.stopObserver(handler.observerId);
      var eventName = "FileObserver."+handler.observerId;
      document.removeEventListener(eventName,handler);
    };
    this.tail = function(size) {
      return ifs.files.tail(path,size);
    };
    this.toString  = function() { return path; };
    this.unzip = function(dir,callback) {
      var dirPath = toPath(dir);
      if(callback) {
        var event = "unzipFinished";
        var handler = function(e) {
          if(e.detail.folder==dirPath && e.detail.zip==path) {
            document.removeEventListener(event,handler);
            callback(e.detail);
          }
        }
        document.addEventListener(event,handler);
      }
      console.log("unzipping "+path+" to "+dirPath);
      ifs.files.unzip(path,dirPath);
    }

    this.unzipText = function(name) {
      return ifs.files.unzipText(path,name);
    }

    this.unzipOne = function(what,dest) {
      return new Promise(function(resolve,reject){
          var eventName = makeEventName("unzipOne.finished.");
          var handler = function(e) {
            document.removeEventListener(eventName,handler);
            var res = e.detail;
            if(res.ok) resolve(res);
            else reject(res);
          }
          document.addEventListener(eventName,handler);
          ifs.files.unzipOne(path,what,toPath(dest),eventName);
      });
    }
    this.visit = function(callback) {
      var list = this.listFiles();
      for(var i=0; i<list.length; ++i) {
        var file = list[i];
        if(!callback(file)) return false;
        if(file.isDirectory()) {
          if(!file.visit(callback)) return false;
        }
      }
      return true;
    };
    this.write = function(str) { return ifs.files.write(path,str); };
    this.writeBase64 = function(str) { return ifs.files.writeBase64(path,str); };
    this.zip = function(zip,callback) {
      var zipPath = toPath(zip);
      if(callback) {
        var event = "zipFinished";
        var handler = function(e) {
          if(e.detail.folder==path && e.detail.zip==zipPath) {
            document.removeEventListener(event,handler);
            callback(e.detail);
          }
        }
        document.addEventListener(event,handler);
      }
      ifs.files.zip(path,zipPath);
    }
  };

  var AssetFile = function() {
    var path = (arguments.length==1?toPath(arguments[0]):extendPath(toPath(arguments[0]),toPath(arguments[1])));
    this.copyTo = function(file) {
      return ifs.files.copyAssets(path,toPath(file));
    };
    this.equals = function(file) { return path==toPath(file); };
    this.getName = function() {
      var idx = path.lastIndexOf("/");
      if(idx>=0) return path.substring(idx+1);
      else return path;
    };
    this.getParent = function() {
      var idx = path.lastIndexOf("/");
      if(idx>0) return new AssetFile(path.substring(0,idx));
      else return null;
    };
    this.getSuffix = function() {
      var name = this.getName();
      var idx = name.lastIndexOf(".");
      if(idx>0) return name.substring(idx+1);
      else return null;
    };
    this.isFile = function() { return ifs.files.isAssetFile(path); };
    this.isDirectory = function() { return ifs.files.isAssetDir(path); };
    this.list = function() { return JSON.parse(ifs.files.listAssets(path)); };
    this.listFiles = function() {
      var list = JSON.parse(ifs.files.listAssets(path));
      for(var i=0; i<list.length; ++i) list[i] = new AssetFile(path,list[i]);
      return list;
    };
    this.read = function() {
      return ifs.files.readAsset(path);
    };
    this.toString  = function() { return path; }
  };

  var files = {
    cancelCopyInBackground : function() {
      ifs.files.cancelCopyInBackground();
    },
    copyInBackground : function(arr) {
      ifs.files.copyInBackground(JSON.stringify(arr));
    },
    createTempFile : function(prefix,suffix,dir) {
      return new File(ifs.files.createTempFile(prefix,suffix,toPath(dir)));
    },
    getBackgroundStatus : function() {
      return JSON.parse(ifs.files.getBackgroundStatus());
    },
    getFilesDir : function() {
      return new File(ifs.files.getFilesDir());
    },
    getExternalFilesDir : function() {
      var dir = ifs.files.getExternalFilesDir();
      if(dir==null) return null;
      else return new File(dir);
    },
    getPublicDir : function(type) {
      return new File(ifs.files.getPublicDir(type));
    },
    getRootDir : function() {
      return new File(ifs.files.getRootDir());
    },
    getExternalDir : function() {
      return new File(ifs.files.getExternalDir());
    },


    isGoodName : function(name) {
      if(!name||name.length==0) return false;
      if(ifs.webView.getUTF8Length(name)>255) return false;
      if(name.indexOf("/")>=0) return false;
      return  true;
    },

    extensionToMimeType: function(ext) {
      return ifs.files.extensionToMimeType(ext);
    },

    mimeTypeToExtension: function(mimeType) {
      return ifs.files.mimeTypeToExtension(mimeType);
    },

    toFile : function(obj) {
      if(obj instanceof android.File) return obj;
      else return new android.File(obj);
    },

  };

  var gravity = { LEFT:3, RIGHT:5, START:8388611, END:8388613};


  var requestCodeCounter = 1;

  var activity = {
    addEventInstruction: function(instr) {
      ifs.activity.addEventInstruction(JSON.stringify(instr));
    },
    dispatchEvent: function(name,detail) {
      if(!detail) detail = {};
      var json = JSON.stringify(detail);
      ifs.activity.fireEvent(name,json);
    },
    finish : function() {
      ifs.activity.finish();
    },
    finishActivity : function(requestCode) {
      ifs.activity.finishActivity(requestCode);
    },
    hideKeyboard : function() {
      ifs.activity.hideKeyboard();
    },
    inflateView : function(layout,parent,id) {
      ifs.activity.inflateView(layout,parent,id);
    },
    setBackAction : function(action) {
      ifs.activity.setBackAction(action);
    },
    setTitle : function(title) {
      ifs.activity.setTitle(title);
    },
    showView : function(name) {
      ifs.activity.setVisibility(name,0);
    },
    hideView : function(name) {
      ifs.activity.setVisibility(name,8);
    },
    startActivity : function(intent,showChooser) {
      ifs.activity.startActivity(JSON.stringify(intent),showChooser?true:false);
    },
    startActivityForResult : function(intent,callback,showChooser) {
      var rc = requestCodeCounter++;
      var eventHandler = function(e) {
        if(e.detail.requestCode==rc) {
          document.removeEventListener("activityResult",eventHandler);
          if(callback) callback(e.detail);
        }
      }
      document.addEventListener("activityResult",eventHandler);
      ifs.activity.startActivityForResult(JSON.stringify(intent),rc,showChooser?true:false);
      return rc;
    },
    updateMenu : function(menu) {
      ifs.activity.updateMenu(JSON.stringify(menu));
    },
    loadUrl : function(name,url) {
      ifs.activity.loadUrl(name,url);
    },
    closeDrawer : function(gravity) {
      ifs.activity.closeDrawer(gravity);
    },
    openDrawer : function(gravity) {
      ifs.activity.openDrawer(gravity);
    },
    isDrawerOpen : function(gravity) {
      return ifs.activity.isDrawerOpen(gravity);
    },
    getIntent: function() {
      return JSON.parse(ifs.activity.getIntent());
    },
    getIntentAction : function() {
      return ifs.activity.getIntentAction();
    },
    getIntentData : function() {
      return ifs.activity.getIntentData();
    },
    getIntentExtra : function(name) {
      if(!name) {
        try {
          var json = ifs.activity.getIntentExtra(null);
          return JSON.parse(json);
        }
        catch(e) { console.log("error: "+e); return {}; }
      }
      else return ifs.activity.getIntentExtra(name);
    },
    getOwnClassName: function() {
      return ifs.activity.getOwnClassName();
    },
    getPackageName: function() {
      return ifs.activity.getPackageName();
    },
    listRingtones: function() {
      return JSON.parse(ifs.activity.listRingtones());
    },
    sendBroadcast: function(intent) {
      var err = ifs.activity.sendBroadcast(JSON.stringify(intent));
      if(err) throw new Error(err);
    },
    shareFile: function(file,mimeType,callback) {
      var contentUri = android.files.toFile(file).getContentUri();
      var intent = {
        action: "android.intent.action.SEND",
        type: mimeType,
        extras: {"android.intent.extra.STREAM":contentUri},
        extras_types: {"android.intent.extra.STREAM":"Uri"}
      };
      this.startActivity(intent,callback,true);
    },
    setRefreshing: function(name,value) {
       var id = android.resources.getIdForName("refresh");
       if(id) {
         var act = new android.JavaObject("activity");
         var view = act.findViewById(id);
         if(view) { view.setRefreshing(false);  return true; }
       }
       return false;
    },
    setVisibility: function(name,value) {
      ifs.activity.setVisibility(name,value);
    }

  };

  var bitmaps = {
    decodeBounds: function(file) {
      return JSON.parse(ifs.bitmaps.decodeBounds(file.toString()));
    },
    makeRoundedBitmap: function(spec) {
      var result = JSON.parse(ifs.bitmaps4.makeRoundedBitmap(JSON.stringify(spec)));
      if(result.error) throw new Error(result.error);
    },
    toThumbnail : function(src,dst,iconSize) {
      return ifs.bitmaps.toThumbnail(toPath(src),toPath(dst),iconSize);
    },
    resize: function(src,dst,sample,maxWidth,maxHeight,quality) {
      return ifs.bitmaps.resize(toPath(src),toPath(dst),sample,maxWidth,maxHeight,quality);
    }
  };

  var dialog = {
    create: function(name,data,show) {
      return ifs.dialog.create(name,JSON.stringify(data),show);
    },
    createNew: function(name,data,show) {
      ifs.dialog.createNew(name,JSON.stringify(data),show);
    },
    show: function(name) {
      return ifs.dialog.show(name);
    },
    dismiss: function(name) {
      return ifs.dialog.dismiss(name);
    },
    fireEvent: function(name,data) {
      return ifs.dialog.fireEvent(name,JSON.stringify(data));
    },
    onDismiss: function(name,callback) {
      var handler = function(e){
        if(e.detail.name==name) {
          document.removeEventListener("DialogDismissed",handler);
          callback(e.detail);
        }
      }
      document.addEventListener("DialogDismissed",handler);
    }
  }

  function checkDialog() { if(!ifs.thisDialog) throw new Error("not in a dialog"); }

  var thisDialog = {
    dismiss: function() {
      checkDialog();
      ifs.thisDialog.dismiss();
    },
    putObject: function(name,obj) {
      checkDialog();
      ifs.thisDialog.putObject(name,JSON.stringify(obj));
    },
    putArray: function(name,obj) {
      checkDialog();
      ifs.thisDialog.putArray(name,JSON.stringify(obj));
    },
    putString: function(name,obj) {
      checkDialog();
      ifs.thisDialog.putString(name,obj);
    },
    putInt: function(name,obj) {
      checkDialog();
      ifs.thisDialog.putInt(name,obj);
    },
    putFloat: function(name,obj) {
      checkDialog();
      ifs.thisDialog.putFloat(name,obj);
    },
    putBoolean: function(name,obj) {
      checkDialog();
      ifs.thisDialog.putBoolean(name,obj);
    },
    getObject: function(name) {
      checkDialog();
      return JSON.parse(ifs.thisDialog.getObject(name));
    },
    getArray: function(name) {
      checkDialog();
      return JSON.parse(ifs.thisDialog.getArray(name));
    },
    getString: function(name) {
      checkDialog();
      return ifs.thisDialog.getString(name);
    },
    getBoolean: function(name) {
      checkDialog();
      return ifs.thisDialog.getBoolean(name);
    },
    getInt: function(name) {
      checkDialog();
      return ifs.thisDialog.getInt(name);
    },
    getFloat: function(name) {
      checkDialog();
      return ifs.thisDialog.getDouble(name);
    },
  }

  var toast = {
    show : function(msg) {
      ifs.toast.show(msg);
    },
    showLong : function(msg) {
      ifs.toast.showLong(msg);
    }
  };

  var webView = {
    addInterfaces : function(interfaces,callback) {
      var eventHandler = function() {
        document.removeEventListener("WebViewInterfacesAdded", eventHandler);
        callback();
      };
      document.addEventListener("WebViewInterfacesAdded",eventHandler)
      ifs.webView.addInterfaces(JSON.stringify(interfaces));
    },
    clearCache : function() { ifs.webView.clearCache(); },
    clearHistory : function() { ifs.webView.clearHistory(); },
    enableZoom : function(enable) {
      ifs.webView.enableZoom(enable);
    },
    getArgument : function() {
      return ifs.webView.getArgument();
    },
    getErrorCode : function() {
      return ifs.webView.getErrorCode();
    },
    getFailingUrl : function() {
      return ifs.webView.getFailingUrl();
    },
    resetError : function() {
      ifs.webView.resetError();
    },
    print : function() {
      ifs.webView.print();
    },
    getId : function() {
      return ifs.webView.getId();
    },
    isInActionMode: function() {
      return ifs.webView.isInActionMode();
    },
    registerForBroadcast: function(action) {
      ifs.webView.registerForBroadcast(action);
    },
    unregisterForBroadcast: function(action) {
      ifs.webView.unregisterForBroadcast(action);
    },
    setAllowExternalURLs : function(allow) {
      ifs.webView.setAllowExternalURLs(allow);
    },
    setAlertTitle : function(title) {
      ifs.webView.setAlertTitle(title);
    },
    setAlertTheme : function(name) {
      if(!ifs.webView.setAlertTheme(name)) throw new Error("Theme not found: "+name);
    },
    setArgument : function(arg) {
      ifs.webView.setArgument(arg);
    },
    setBackButtonLogic : function(logic) {
      ifs.webView.setBackButtonLogic(logic);
    },
    setCacheMode : function(value) {
      ifs.webView.setCacheMode(value);
    },
    setConsoleId : function(id) {
      ifs.webView.setConsoleId(id);
    },
    setActionModeType : function(type) {
      ifs.webView.setActionModeType(type);
    },
    startActionMode : function(name) {
      ifs.webView.startActionMode(name);
    },
    setOutput: function(console,log) {
      ifs.webView.setOutput(console?true:false,log?true:false);
    },
    setNoInputConnection: function(value) {
      ifs.webView.setNoInputConnection(value);
    },
    setImeInfo: function(value) {
      ifs.webView.setImeInfo(JSON.stringify(value));
    },

  };



  var billing = {
    init: function(callback) {
      /*var eventHandler = function(e) {
        document.removeEventListener("JSBilling.bound",eventHandler);
        callback();
      }
      document.addEventListener("JSBilling.bound",eventHandler);
      ifs.billing.init();*/
      throw new Error("No longer supported");
    },
    purchase : function(type,sku,callback) {
      /*if(type!="inapp" && type!="subs") throw new Error("Invalid type: "+type+", must be 'inapp' or 'subs'");
      var rc = requestCodeCounter++;
      var eventHandler = function(e) {
        if(e.detail.requestCode==rc) {
          document.removeEventListener("activityResult",eventHandler);
          callback(e.detail);
        }
      }
      document.addEventListener("activityResult",eventHandler);
      ifs.billing.requestPurchase(type,sku,rc);*/
      throw new Error("No longer supported");
    },
    getOwnedItems : function(type,callback) {
      /*var rc = requestCodeCounter++;
      var tag = ""+rc;
      var eventHandler = function(e) {
        if(e.detail.tag==tag) {
          document.removeEventListener("JSBilling.purchasedItems",eventHandler);
          if(e.detail.RESPONSE_CODE!=0) throw {src:"billing",info:e.detail};
          var items = e.detail.items;
          for(var i=0; i<items.length; ++i) {
            items[i].data = JSON.parse(items[i].data);
          }
          callback(e.detail);
        }
      }
      document.addEventListener("JSBilling.purchasedItems",eventHandler);
      ifs.billing.requestPurchasedItems(type,tag);
      */
      throw new Error("No longer supported");
    },
    getItemInfo : function(type,skuList,callback) {
      /*if(type!="inapp" && type!="subs") throw new Error("Invalid type: "+type+", must be 'inapp' or 'subs'");
      var eventHandler = function(e) {
        document.removeEventListener("JSBilling.itemInfo",eventHandler);
        if(e.detail.RESPONSE_CODE!=0) throw {src:"billing",info:e.detail};
        e.detail.DETAILS_LIST = JSON.parse(e.detail.DETAILS_LIST);
        callback(e.detail);
      }
      document.addEventListener("JSBilling.itemInfo",eventHandler);
      ifs.billing.requestItemInfo(type,JSON.stringify(skuList));
      */
      throw new Error("No longer supported");
    }
  };

  var location = {
    provider : {gps:"gps",network:"network"},
    getLastKnownLocation : function(provider) {
      var result = ifs.location.getLastKnownLocation(provider);
      if(result==null) return null;
      else return JSON.parse(result);
    },
    requestLocationUpdates : function(provider,minTime,minDistance) {
      var result = ifs.location.requestLocationUpdates(provider,minTime,minDistance);
      if(result==null) return null;
      else return JSON.parse(result);
    },
    stopLocationUpdates : function() {
      ifs.location.stopLocationUpdates();
    },
    isProviderEnabled : function(provider) {
      return ifs.location.isProviderEnabled(provider);
    },
    getProviders : function(enabledOnly) {
      if(typeof enabledOnly ==='undefined'
      || (enabledOnly!==true && enabledOnly!==false)) enabledOnly = false;
      return JSON.parse(ifs.location.getProviders(enabledOnly));
    }
  };

  var clipboard = {
    hasText : function() { return ifs.clipboard.hasText(); },
    getText : function() { return ifs.clipboard.getText(); },
    setText : function(text) { ifs.clipboard.setText(text); }
  };

  var content = {
    getUriInfo : function(uri) {
      var info = ifs.activity.getUriInfo(uri);
      if(info) return JSON.parse(info);
      else return {};
    },
  };

  var download = {
    start : function(info) {
      if(!info) throw new Error("No info provided for download.start()");
      if(!info.url) throw new Error("No 'url' provided for download.start()");
      if(!info.path) throw new Error("No 'path' provided for download.start()");
      var json = JSON.stringify(info);
      var id = ifs.download.startDownload(json);
      if(id==0) throw new Error(ifs.download.lastError());
      return id;
    },
    checkDownloadStatus: function(id) {
      var json = ifs.download.checkDownloadStatus(id);
      if(json==null) throw new Error("Cannot check download status: "+ifs.download.lastError());
      return JSON.parse(json);
    },
    remove: function(id) {
      ifs.download.remove(id);
    },
    status : { success:8,running:2,pending:1,paused:4,failed:16},
    reason : {waiting_to_retry:1,waiting_for_network:2,waiting_for_wifi:3,unknown:4,},
    visibility : {hidden:2,visible:0,visible_notify_completed:1}
  };

  var log = {
    read : function(thisProcessOnly) { return ifs.log.read(thisProcessOnly); }
  };

  var vibrator = {
    vibrate : function(msec) { ifs.vibrator.vibrate(msec); },
    cancel : function() { ifs.vibrator.cancel(); }
  };

  var resources = {
    getIdForName : function(name) {
      return ifs.activity.getIdForName(name);
    },
    listByType: function(type) {
      var result = ifs.activity.listResourcesByType(type);
      if(!result) throw new Error("Invalid resource type: "+type);
      return JSON.parse(result);
    }
  };

  var sensors = {
    typeAmbientTemperature : 13,
    typeGameRotationVector : 15,
    typeGeomagneticRotationVector  : 20,
    typeGravity : 9,
    typeGyroscope : 4,
    typeGyroscopeUncalibrated : 16,
    typeHeartRate : 21,
    typeLight : 5,
    typeLinearAcceleration : 10,
    typeMagneticField : 2,
    typeMagneticFieldUncalibrated : 14,
    typePressure : 6,
    typeProximity : 8,
    typeRelativeHumidity : 12,
    typeRotationVector : 11,
    typeSignificantMotion : 17,
    typeStepCounter : 19,
    typeStepDetector : 18,
    typeTemperature : 7,

    enableSensor : function(type) {
      return ifs.sensors.enableSensor(type);
    },
    disableSensor : function(type) {
      ifs.sensors.disableSensor(type);
    }
  };

  var admob = {
    addTestDevice: function(deviceId) {
      ifs.admob.addTestDevice(deviceId);
    },
    createBanner: function(unitId,parentId,position) {
      ifs.admob.createBanner(unitId,parentId,position);
    },
    getDeviceId: function() {
      return ifs.admob.getDeviceId();
    },
    loadBanner: function(name) {
      ifs.admob.loadBanner(name);
    },
    initInterstitial: function(unitId,callback) {
      if(callback) {
        var handler = function() {
          document.removeEventListener("AdMob.Interstitial.InitDone",handler);
          callback();
        }
        document.addEventListener("AdMob.Interstitial.InitDone",handler);
      }
      ifs.admob.initInterstitial(unitId);
    },
    loadInterstitial: function(callback) {
      if(callback) {
        var handler = function() {
          document.removeEventListener("AdMob.Interstitial.AdLoaded",handler);
          callback();
        }
        document.addEventListener("AdMob.Interstitial.AdLoaded",handler);
      }
      ifs.admob.loadInterstitial();
    },
    showInterstitial: function() {
      ifs.admob.showInterstitial();
    },
    requestInterstitialStatus: function(callback) {
      if(callback) {
        var handler = function() {
          document.removeEventListener("AdMob.Interstitial.Status",handler);
          callback();
        }
        document.addEventListener("AdMob.Interstitial.Status",handler);
      }
      ifs.admob.requestInterstitialStatus();
    },
    setInterstitialAutoReload: function(value) {
      ifs.admob.setInterstitialAutoReload(value===true);
    }
  };

  var system = {
    getApiLevel: function() {
      var version = new JavaObject("android.os.Build$VERSION");
      return version.get_SDK_INT();
    },
    getAppVersionCode: function() {
      var act = new JavaObject("activity");
      var pInfo = act.getPackageManager().getPackageInfo(act.getPackageName(), 0);
      return pInfo.get_versionCode();
    },
    checkRuntimePermission: function(name) {
      var ver = android.system.getApiLevel();
      if(ver<23) {
        return true;
      }
      var cc = new JavaObject("androidx.core.content.ContextCompat");
      var act = new JavaObject("activity");
      return cc.checkSelfPermission(act,name)==0;
    },
    requestPermissions: function(name) {
      var ver = android.system.getApiLevel();
      if(ver<23) return;
      var ac = new JavaObject("androidx.core.app.ActivityCompat");
      var act = new JavaObject("activity");
      var names;
      if(Array.isArray(name)) names = name;
      else names = [name];
      var rc = requestCodeCounter++;
      ac.requestPermissions(act,names,rc);
    }

  };

  var viewPager = {

    getCurrentItem: function(id,callback) {
      var event = "ViewPager.CurrentItem";
      var handler = function(e) {
        if(e.detail.id==id) {
          document.removeEventListener(event,handler);
          callback(e.detail.position);
        }
      };
      document.addEventListener(event,handler);
      ifs.viewPager.getCurrentItem(id);
    },

    OnPageSelected: function(id,callback) {
      var event = "ViewPager.OnPageSelected";
      var handler = function(e) {
        if(e.detail.id==id) {
          callback(e.detail.position);
        }
      };
      document.addEventListener(event,handler);
    },

    setCurrentItem: function(id,position) {
      ifs.viewPager.setCurrentItem(id,position);
    },

    setData: function(id,data) {
      ifs.viewPager.setData(id,JSON.stringify(data));
    },

    setOffscreenPageLimit: function(id,limit) {
      ifs.viewPager.setOffscreenPageLimit(id,limit);
    },

    setPageIcon: function(id,position,icon) {
      ifs.viewPager.setPageIcon(id,position,icon);
    },

    setPageTitle: function(id,position,title) {
      ifs.viewPager.setPageTitle(id,position,title);
    },
  };


  var network = {

    uploadFile: function(file,url,parms) {
      ifs.network.uploadFile(file.toString(),url,JSON.stringify(parms));
    },
  };

  var notification = {
    cancel: function(id) {
      ifs.notification.cancel(id);
    },
    cancelAll: function() {
      ifs.notification.cancelAll();
    },
    show: function(id,data) {
      ifs.notification.show(id,JSON.stringify(data));
    },
  };

  var firebase = {
    getCurrentUser: function() {
      var user = ifs.firebase.getCurrentUser();
      if(user) return JSON.parse(user);
      else return null;
    },

    getDownloadUrl: function(storagePath,params) {
       if(!params) params = {};
       return new Promise(function(resolve,reject){
          var eventName = makeEventName("android.firebase.getDownloadUrl.");
          var handler = function(e) {
            document.removeEventListener(eventName,handler);
            var res = e.detail;
            if(res.ok) resolve(res);
            else reject(res);
          }
          document.addEventListener(eventName,handler);
          ifs.firebase.getDownloadUrl(storagePath,JSON.stringify(params),eventName);
       });
    },

    getFile: function(filePath,storagePath,params) {
       if(!params) params = {};
       ifs.firebase.getFile(filePath.toString(),storagePath,JSON.stringify(params));
    },

    getFileData: function(storagePath,params) {
       if(!params) params = {};
       ifs.firebase.getFileData(storagePath,JSON.stringify(params));
    },

    once: function(path,filter) {
      if(!filter) filter = null;
      else {
        if(filter.constructor===Array) filter = JSON.stringify(filter);
        else filter = JSON.stringify([filter]);
      }
      return new Promise(function(resolve,reject){
          var eventName = makeEventName("android.firebase.once.");
          var handler = function(e) {
            document.removeEventListener(eventName,handler);
            var res = e.detail;
            if(res.ok) resolve(res);
            else reject(res);
          }
          document.addEventListener(eventName,handler);
          ifs.firebase.once(path,filter,eventName);
      });
    },

    listenTo: function(path,filter,event) {
      if(!path) path = "";
      if(!filter) filter = null;
      else {
        if(filter.constructor===Array) filter = JSON.stringify(filter);
        else filter = JSON.stringify([filter]);
      }
      if(!event) event = "Firebase.listenTo";
      ifs.firebase.listenTo(path,filter,event);
    },

    logEvent: function(name,data) {
      if(!data) data = {};
      ifs.firebase.logEvent(name,JSON.stringify(data));
    },

    makeKey: function(path) {
      return ifs.firebase.makeKey(path);
    },

    putFile: function(filePath,storagePath,params) {
       if(!params) params = {};
       return new Promise(function(resolve,reject){
          var eventName = makeEventName("android.firebase.putFile.");
          var handler = function(e) {
            document.removeEventListener(eventName,handler);
            var res = e.detail;
            if(res.ok) resolve(res);
            else reject(res);
          }
          document.addEventListener(eventName,handler);
          ifs.firebase.putFile(filePath.toString(),storagePath,JSON.stringify(params),eventName);
       });
    },

    putFileData: function(storagePath,params) {
       if(!params) params = {};
       ifs.firebase.putFileData(storagePath,JSON.stringify(params));
    },

    removeValue: function(path) {
       return new Promise(function(resolve,reject){
          var eventName = makeEventName("android.firebase.removeValue.");
          var handler = function(e) {
            document.removeEventListener(eventName,handler);
            var res = e.detail;
            if(res.ok) resolve(res);
            else reject(res);
          }
          document.addEventListener(eventName,handler);
          ifs.firebase.removeValue(path,eventName);
       });
    },

    setValue: function(path,value) {
       return new Promise(function(resolve,reject){
          var eventName = makeEventName("android.firebase.setValue.");
          var handler = function(e) {
            document.removeEventListener(eventName,handler);
            var res = e.detail;
            if(res.ok) resolve(res);
            else reject(res);
          }
          document.addEventListener(eventName,handler);
          if(value.constructor === Array) ifs.firebase.setValueArray(path,JSON.stringify(value),eventName);
          else
          if(typeof value === 'object') ifs.firebase.setValueObject(path,JSON.stringify(value),eventName);
          else ifs.firebase.setValue(path,""+value,eventName);
       });
    },

    setUserId: function(id) {
      ifs.firebase.setUserId(id);
    },

    setUserProperty: function(name,value) {
      ifs.firebase.setUserProperty(name,value);
    },

    signInWithGoogle: function(params) {
      if(params) params = JSON.stringify(params);
      else params = null;
      return new Promise(function(resolve,reject){
          var eventName = "Firebase.signIn";
          var handler = function(e) {
            document.removeEventListener(eventName,handler);
            var res = e.detail;
            if(res.error) reject(res.error);
            else resolve(res);
          }
          document.addEventListener(eventName,handler);
          var ret =  JSON.parse(ifs.firebase.signInWithGoogle(params));
          if(ret.error) {
            document.removeEventListener(eventName,handler);
            reject(ret.error);
          }
       });
    },

    signOut: function() {
      ifs.firebase.signOut();
    },

    subscribe: function(topic) {
      try { ifs.firebase.subscribeToTopic(topic); } catch(err) { }
    },

    unsubscribe: function(topic) {
      try { ifs.firebase.unsubscribeFromTopic(topic); } catch(err) { }
    },
  };

  var google = {
    getLastSignIn: function() {
       var info = ifs.googleAuth.getLastSignIn();
       if(info==null) return null;
       else return JSON.parse(info);
    },

    signIn: function(params) {
       return JSON.parse(ifs.googleAuth.signIn(params?JSON.stringify(params):"{}"));
    },

    signOut: function() {
       return JSON.parse(ifs.googleAuth.signOut());
    },
  };

  var alarm = {
    cancel: function(params) {
      var res = ifs.alarm.cancel(JSON.stringify(params));
      if(res.error) throw new Error(res.error);
    },
    set: function(params) {
      var res = ifs.alarm.set(JSON.stringify(params));
      if(res.error) throw new Error(res.error);
    },
  };

  var appBuilder = {
    getAppInfo: function(url) {
        return new Promise(function(resolve,reject){
          var xhttp = new XMLHttpRequest();
          xhttp.onreadystatechange = function() {
            if(this.readyState == 4) {
               if(this.status!==200) { reject(this.status); return; }
               try {
	             var obj = JSON.parse(xhttp.responseText);
	             resolve(obj);
               }
               catch(err) { reject(-1,xhttp.responseText); }
            }
          }
          xhttp.open("GET", url, true);
          xhttp.send();
        });
    },
  };

  var control = {
    execute: function(code) {
       java.activity.getEasy().executeOnMainThread(code);
    },
    dispatchEvent: function(name,params) {
      if(!params) params = [];
       var json = JSON.stringify(params);
       java.activity.getEasy().dispatchEvent(name,json);
    },
  };

  return {
    alarm: alarm,
    appBuilder: appBuilder,
    admob : admob,
    AssetFile : AssetFile,
    File : File,
    java: java,
    JavaObject : JavaObject,
    Reflect : Reflect,
    activity : activity,
    billing : billing,
    bitmaps : bitmaps,
    clipboard : clipboard,
    content : content,
    control : control,
    dialog: dialog,
    download : download,
    files : files,
    firebase: firebase,
    google: google,
    gravity : gravity,
    location : location,
    log : log,
    network: network,
    notification: notification,
    observerMask : {
       ACCESS : 1,
       ALL_EVENTS : 4095,
       ATTRIB : 4,
       CLOSE_NOWRITE : 16,
       CLOSE_WRITE : 8,
       CREATE : 256,
       DELETE : 512,
       DELETE_SELF : 1024,
       MODIFY : 2,
       MOVED_FROM : 64,
       MOVED_TO : 128,
       MOVE_SELF : 2048,
       OPEN : 32,
    },
    reflect: reflect,
    resources : resources,
    sensors : sensors,
    system: system,
    thisDialog: thisDialog,
    toast : toast,
    vibrator : vibrator,
    viewPager: viewPager,
    webView : webView
  };
})(window);