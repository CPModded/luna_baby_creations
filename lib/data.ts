export const products = [
 {id:'pastel',name:'Attache tétine pastel',slug:'attache-tetine-pastel',description:'Attache tétine personnalisée faite main avec des matériaux adaptés aux tout-petits.',price:2290,compareAt:2490,stock:18,image:'/products/pastel.svg',category:'Attaches tétines',featured:true},
 {id:'nude',name:'Attache tétine nude',slug:'attache-tetine-nude',description:'Une création douce aux tons naturels, personnalisable avec le prénom de bébé.',price:2290,stock:14,image:'/products/nude.svg',category:'Attaches tétines',featured:true},
 {id:'fleurie',name:'Attache tétine fleurie',slug:'attache-tetine-fleurie',description:'Une attache fleurie délicate, pensée comme un petit cadeau unique.',price:2390,stock:10,image:'/products/fleurie.svg',category:'Attaches tétines',featured:true},
 {id:'portecles',name:'Porte-clés prénom',slug:'porte-cles-prenom',description:'Petit porte-clés personnalisé assorti aux créations Luna Baby.',price:1590,stock:20,image:'/products/keyring.svg',category:'Porte-clés',featured:false},
 {id:'coffret',name:'Coffret naissance douceur',slug:'coffret-naissance-douceur',description:'Un coffret cadeau composé de petites créations coordonnées.',price:4490,compareAt:4990,stock:8,image:'/products/coffret.svg',category:'Coffrets',featured:true},
 {id:'hochet',name:'Hochet bois personnalisé',slug:'hochet-bois',description:'Hochet en bois personnalisé, conçu pour accompagner les premiers mois.',price:2490,stock:12,image:'/products/rattle.svg',category:'Accessoires',featured:false}
]
export const euro=(c:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(c/100)
