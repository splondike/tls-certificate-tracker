"use strict";

const {Cc, Ci, Cu} = require("chrome");
const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
const {TextDecoder, TextEncoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

const filePath = "/home/normal/Desktop/ca-data.json";

function DataStore(path) {
   let that = this;
   this._path = path;
   this._data = {};
   this._flush = function(){};
   this._lastFlushPromise = new Promise(function(res, rej) {
      res();
   });

   OS.File.exists(path).then(function(exists) {
      let nextStep;
      if (exists) {
         nextStep = OS.File.open(path, {read: true}).then((file) => {
            return file.read()
         }).then((dataArr) => {
            const decoder = new TextDecoder();
            const dataStr = decoder.decode(dataArr);
            const loadedData = JSON.parse(dataStr);
            for(let i in loadedData) {
               let fileData = loadedData[i];
               let instanceData = (i in that._data) ? that._data[i] : {};
               for (let j in fileData) {
                  instanceData[j] = true;
               }
               that._data[i] = instanceData;
            }
         });
      } else {
         nextStep = new Promise(function(res, rej) {
            res();
         });
      }

      nextStep.then(function() {
         that._flush = function() {
            that._lastFlushPromise.then(function() {
               const encoder = new TextEncoder();
               const data = encoder.encode(JSON.stringify(that._data));
               that._lastFlushPromise = OS.File.writeAtomic(filePath, data);
            });
         };
         that._flush();
      });
   });
}
DataStore.prototype.save = function(cert, host) {
   if (cert in this._data) {
      var hostnames = this._data[cert];
   } else {
      var hostnames = {};
   }
   if (!(host in hostnames)) {
      hostnames[host] = true;
      this._data[cert] = hostnames;
      this._flush();
   }
}

const dataStore = new DataStore(filePath);

const httpRequestObserver = {
   observe: function(subject, topic, data) {
      if (topic === "http-on-examine-response") {
         subject.QueryInterface(Ci.nsIHttpChannel);
         const securityInfo = subject.securityInfo;
         if (!securityInfo) return;

         securityInfo.QueryInterface(Ci.nsISSLStatusProvider);
         const sslStatus = securityInfo.SSLStatus;
         if (!sslStatus) return;
         if (sslStatus.isUntrusted) return;

         const getRootIssuer = function(obj) {
            if (obj.issuer === null) {
               return obj;
            } else {
               return getRootIssuer(obj.issuer);
            }
         }
         console.log(sslStatus.serverCert);
         const rootCA = getRootIssuer(sslStatus.serverCert);
         const name = rootCA.issuerOrganization + " " + rootCA.issuerOrganizationUnit;
         const fingerprint = rootCA.sha256Fingerprint;
         const caStr = name + " " + fingerprint;
         dataStore.save(caStr, subject.URI.host);
      }
   }
};

observerService.addObserver(httpRequestObserver, "http-on-examine-response", false);
