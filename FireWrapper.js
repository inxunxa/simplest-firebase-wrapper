import firebase from 'firebase';
import { config } from '../../FirebaseCredentials'

/* thanks to:
    https://github.com/Thoughtscript/x_team_vue
*/

/*
   asynOpts= {
       addIfNotFound: true,
       key: 'key',
       onChildAdded: null,
       onChildChanged: null,
       onChilRemoved: null
   }
*/

var db;
export function initFB() {
    if (!firebase.apps.length) {
      firebase.initializeApp(config)
    }
    db = firebase.database()
}

export var syncFB = {

    getDefaultOpts: () => {
        return {
            addIfNotFound: true,
            key: 'key',
            validated: true
        };
    },

    getOpts: (opts) => {
        if(opts && opts.validated) return opts;
        if(!opts) return syncFB.getDefaultOpts();        

        //verify each parameter exist or add a default value
        var defs = syncFB.getDefaultOpts();
        for(var key in defs){
           if(opts[key] === undefined){
               opts[key] = defs[key];
           }
        }
        opts.validated = true;
        console.log('opts validated', opts);

        return opts;
    },

    updateObject(base, upd, key){
        for(var k in upd){
            if(k != key){ // do not update the key
                base[k]=upd[k]
            }
        }
    },

    subscribeAll: (ref, list, synOpts) => {
        var opts = syncFB.getOpts(synOpts);
        syncFB.subscribeNew(ref, list, opts);
        syncFB.subscribeChanged(ref, list, opts);
        syncFB.subscribeRemoved(ref, list, opts);
    },

    subscribeNew: (ref, list, synOpts) => {        
        var opts = syncFB.getOpts(synOpts);
        db.ref(`/${ref}`)
            .on('child_added', function (snap, xy) {                
                var tmp = snap.val();
                tmp[opts.key] = snap.ref.key;
                list.push(tmp);                
                if(synOpts.onChildAdded){
                    synOpts.onChildAdded(tmp);
                }
            })
    },


    subscribeChanged: (ref, list, synOpts) => {
        var opts = syncFB.getOpts(synOpts);
        db.ref(`/${ref}`)
            .on('child_changed', function (snap, key) {
                var tmp = snap.val();
                tmp[opts.key] = snap.ref.key;
                for(let i=0; i< list.length; i++){
                    if(list[i][opts.key] == tmp[opts.key]){
                        syncFB.updateObject(list[i], tmp, opts.key);
                        return;
                    }
                }
                // not found, should be added?
                if(opts.addIfNotFound){
                    list.push(tmp);
                }
            })
    },

    subscribeRemoved: (ref, list, synOpts) => {
        var opts = syncFB.getOpts(synOpts);
        db.ref(`/${ref}`)
            .on('child_removed', function (snap, key) {
                var tmp = snap.val();
                tmp[opts.key] = snap.ref.key;
                for(let i=0; i< list.length; i++){
                    if(list[i][opts.key] == tmp[opts.key]){
                        list.splice(i, 1);
                        return;
                    }
                }                
            })
    },
}

export var asyncFB = {

    /** GET All */
    fetchAll: (ref) => new Promise(resolve => {
        db.ref(`/${ref}`)
            .once('value')
            .then(v => resolve(v.val()))
    }),

    /** GET One */
    fetchOne: (ref, key) => new Promise(resolve => {
        db.ref(`/${ref}/${key}`)
            .once('value')
            .then(v => resolve(v.val()))
    }),

    /** POST One */
    addOne: (ref, key, contactData) => new Promise(resolve => {
        resolve(db.ref(`/${ref}`).child(key).set(contactData))
    }),

    /** DELETE One */
    removeOne: (ref, key) => new Promise(resolve => {
        resolve(db.ref(`/${ref}`).child(key).remove())
    })
}
