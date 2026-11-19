const {applicationDefault,initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');

async function main(){
 const [project,uid]=process.argv.slice(2);
 if(!project||!uid)throw Error('Aufruf: node scripts/provision-station-operator.cjs FIREBASE-PROJEKT AUTH-UID');
 const app=initializeApp({credential:applicationDefault(),projectId:project});
 const auth=getAuth(app),user=await auth.getUser(uid);
 if(user.disabled||!user.email||!user.providerData.some(provider=>provider.providerId==='password'))
   throw Error('Die UID muss zu einem aktiven Firebase-Konto mit E-Mail und Passwort gehören.');
 await auth.setCustomUserClaims(uid,{...(user.customClaims||{}),kcOperator:true});
 console.log('Spielleitungsfreigabe gespeichert. Bitte in der Haupt-App neu anmelden.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
