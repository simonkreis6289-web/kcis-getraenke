/* Gemeinsame Anzeigevorgabe für Zahlungsstände; Berechnungen bleiben unverändert. */
(() => {
 const key=v=>String(v||'').trim().normalize('NFKC').toLocaleLowerCase('de');
 function visible(person,people=[]){const name=typeof person==='string'?person:person?.name,stored=people.find(p=>key(p.name)===key(name));return (stored||person)?.showPaymentStatus!==false;}
 function text(person,value,people=[]){return visible(person,people)?String(value):'*';}
 function hidden(people=[]){return people.some(p=>!visible(p));}
 window.KCPaymentVisibility=Object.freeze({visible,text,hidden});
})();
