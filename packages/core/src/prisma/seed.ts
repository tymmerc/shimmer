import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Usage Taxonomy
// ---------------------------------------------------------------------------

const usageTaxonomyEntries = [
  // Bricolage
  { code: 'percage',        label: 'Perçage',                category: 'Bricolage',        keywords: ['percer', 'trou', 'mur', 'béton', 'bois'],                   description: 'Perçage de matériaux divers',       sortOrder: 1 },
  { code: 'coupe_bois',     label: 'Coupe du bois',          category: 'Bricolage',        keywords: ['couper', 'bois', 'planche', 'sciage'],                      description: 'Découpe et sciage du bois',         sortOrder: 2 },
  { code: 'poncage',        label: 'Ponçage',                category: 'Bricolage',        keywords: ['poncer', 'lisser', 'surface', 'bois', 'métal'],             description: 'Ponçage et lissage de surfaces',    sortOrder: 3 },
  { code: 'vissage',        label: 'Vissage / Assemblage',   category: 'Bricolage',        keywords: ['visser', 'assembler', 'monter', 'fixer'],                   description: 'Vissage et assemblage de pièces',   sortOrder: 4 },

  // Électroménager
  { code: 'nettoyage_sol',  label: 'Nettoyage des sols',     category: 'Électroménager',   keywords: ['aspirer', 'nettoyer', 'sol', 'poussière', 'tapis'],         description: 'Aspiration et nettoyage des sols',  sortOrder: 5 },
  { code: 'lavage_linge',   label: 'Lavage du linge',        category: 'Électroménager',   keywords: ['laver', 'linge', 'vêtement', 'tissu'],                      description: 'Lavage et entretien du linge',      sortOrder: 6 },
  { code: 'cuisson',        label: 'Cuisson',                category: 'Électroménager',   keywords: ['cuire', 'chauffer', 'réchauffer', 'micro-ondes'],            description: 'Cuisson et réchauffage des aliments', sortOrder: 7 },
  { code: 'conservation',   label: 'Conservation',           category: 'Électroménager',   keywords: ['congeler', 'conserver', 'froid', 'surgeler'],                description: 'Conservation et congélation des aliments', sortOrder: 8 },

  // Parfumerie / Cosmétiques
  { code: 'soin_peau',      label: 'Soin de la peau',        category: 'Parfumerie',       keywords: ['hydrater', 'peau', 'visage', 'crème', 'sérum'],             description: 'Soins hydratants et anti-âge',      sortOrder: 9 },
  { code: 'maquillage',     label: 'Maquillage',             category: 'Parfumerie',       keywords: ['maquiller', 'teint', 'lèvres', 'yeux', 'fond de teint'],    description: 'Maquillage du visage et du corps',  sortOrder: 10 },
  { code: 'parfum',         label: 'Parfumerie',             category: 'Parfumerie',       keywords: ['parfum', 'fragrance', 'eau de toilette', 'senteur'],        description: 'Parfums et eaux de toilette',       sortOrder: 11 },
  { code: 'soin_corps',     label: 'Soin du corps',          category: 'Parfumerie',       keywords: ['douche', 'corps', 'gel', 'huile', 'bain'],                  description: 'Soins et hygiène du corps',         sortOrder: 12 },

  // Cuisine
  { code: 'decoupe',        label: 'Découpe alimentaire',    category: 'Cuisine',          keywords: ['couper', 'trancher', 'émincer', 'découper', 'légume'],      description: 'Découpe et préparation des aliments', sortOrder: 13 },
  { code: 'cuisson_cuisine',label: 'Cuisson cuisine',        category: 'Cuisine',          keywords: ['cuire', 'poêle', 'cocotte', 'mijoter', 'rôtir'],            description: 'Cuisson des plats sur feu ou four', sortOrder: 14 },
  { code: 'mixage',         label: 'Mixage / Préparation',   category: 'Cuisine',          keywords: ['mixer', 'mélanger', 'battre', 'fouetter', 'pétrir'],        description: 'Mixage et préparation culinaire',   sortOrder: 15 },
  { code: 'pesage',         label: 'Pesage / Mesure',        category: 'Cuisine',          keywords: ['peser', 'mesurer', 'gramme', 'balance'],                    description: 'Pesée et mesure des ingrédients',   sortOrder: 16 },

  // Jardin
  { code: 'tonte',          label: 'Tonte de pelouse',       category: 'Jardin',           keywords: ['tondre', 'pelouse', 'gazon', 'herbe'],                      description: 'Tonte et entretien de la pelouse',  sortOrder: 17 },
  { code: 'taille_haie',    label: 'Taille des haies',       category: 'Jardin',           keywords: ['tailler', 'haie', 'arbuste', 'élaguer'],                    description: 'Taille des haies et arbustes',      sortOrder: 18 },
  { code: 'arrosage',       label: 'Arrosage',               category: 'Jardin',           keywords: ['arroser', 'eau', 'jardin', 'irrigation'],                   description: 'Arrosage du jardin et des plantes', sortOrder: 19 },
  { code: 'amenagement_ext',label: 'Aménagement extérieur',  category: 'Jardin',           keywords: ['aménager', 'terrasse', 'extérieur', 'décoration', 'abri'],  description: 'Aménagement et décoration extérieure', sortOrder: 20 },
];

// ---------------------------------------------------------------------------
// Products – 10 per category
// ---------------------------------------------------------------------------

interface ProductSeed {
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  specs: Record<string, unknown>;
  usages: { code: string; score: number }[];
}

const products: ProductSeed[] = [
  // ===== BRICOLAGE =====
  { sku: 'BRI-001', name: 'Perceuse-visseuse sans fil 18V', description: 'Perceuse-visseuse Bosch Professional 18V avec 2 batteries Li-Ion 2.0 Ah, couple max 63 Nm, mandrin auto-serrant 13 mm.', category: 'Bricolage', brand: 'Bosch', price: 189.99, stock: 45, specs: { voltage: '18V', couple_max: '63 Nm', mandrin: '13 mm', batteries: 2, poids: '1.8 kg' }, usages: [{ code: 'percage', score: 95 }, { code: 'vissage', score: 90 }] },
  { sku: 'BRI-002', name: 'Scie circulaire 1800W', description: 'Scie circulaire Makita 1800W, lame 190 mm, profondeur de coupe 66 mm à 90°. Guide parallèle inclus.', category: 'Bricolage', brand: 'Makita', price: 249.90, stock: 22, specs: { puissance: '1800W', lame: '190 mm', profondeur_coupe: '66 mm', poids: '5.1 kg' }, usages: [{ code: 'coupe_bois', score: 98 }] },
  { sku: 'BRI-003', name: 'Ponceuse excentrique 300W', description: 'Ponceuse excentrique Bosch PEX 400 AE, variateur de vitesse, plateau 125 mm, système microfiltre.', category: 'Bricolage', brand: 'Bosch', price: 89.95, stock: 38, specs: { puissance: '300W', plateau: '125 mm', orbite: '2.5 mm', poids: '1.9 kg' }, usages: [{ code: 'poncage', score: 97 }] },
  { sku: 'BRI-004', name: 'Visseuse à chocs 18V', description: 'Visseuse à chocs Makita DTD153Z, couple max 170 Nm, vitesse variable, éclairage LED intégré.', category: 'Bricolage', brand: 'Makita', price: 129.00, stock: 31, specs: { voltage: '18V', couple_max: '170 Nm', vitesse: '3600 tr/min', poids: '1.1 kg' }, usages: [{ code: 'vissage', score: 98 }, { code: 'percage', score: 40 }] },
  { sku: 'BRI-005', name: 'Meuleuse angulaire 125 mm 1400W', description: 'Meuleuse Bosch Professional GWS 14-125 CI, système anti-vibration, démarrage progressif.', category: 'Bricolage', brand: 'Bosch', price: 159.90, stock: 27, specs: { puissance: '1400W', disque: '125 mm', vitesse: '11000 tr/min', poids: '2.3 kg' }, usages: [{ code: 'coupe_bois', score: 50 }, { code: 'poncage', score: 60 }] },
  { sku: 'BRI-006', name: 'Niveau laser croix vert', description: 'Niveau laser Bosch GCL 2-50 CG avec lignes croisées vertes, portée 50 m, précision ± 0.3 mm/m.', category: 'Bricolage', brand: 'Bosch', price: 329.00, stock: 15, specs: { portee: '50 m', precision: '± 0.3 mm/m', couleur_laser: 'vert', poids: '0.5 kg' }, usages: [{ code: 'vissage', score: 30 }] },
  { sku: 'BRI-007', name: 'Compresseur portatif 24L', description: 'Compresseur Michelin 24L silencieux, 1.5 CV, pression max 8 bar, débit 160 L/min.', category: 'Bricolage', brand: 'Michelin', price: 199.00, stock: 18, specs: { cuve: '24L', puissance: '1.5 CV', pression_max: '8 bar', debit: '160 L/min' }, usages: [{ code: 'percage', score: 20 }, { code: 'poncage', score: 30 }] },
  { sku: 'BRI-008', name: 'Décapeur thermique 2000W', description: 'Décapeur thermique DeWalt D26414, température réglable 50-600°C, écran LCD, buses interchangeables.', category: 'Bricolage', brand: 'DeWalt', price: 109.90, stock: 24, specs: { puissance: '2000W', temperature: '50-600°C', debit_air: '500 L/min', poids: '0.8 kg' }, usages: [{ code: 'poncage', score: 25 }] },
  { sku: 'BRI-009', name: 'Cloueuse pneumatique 15-50 mm', description: 'Cloueuse pneumatique Makita AF506, clous 15-50 mm, chargeur 100 clous, poids plume.', category: 'Bricolage', brand: 'Makita', price: 179.00, stock: 12, specs: { clous: '15-50 mm', chargeur: 100, pression: '4-8 bar', poids: '1.3 kg' }, usages: [{ code: 'vissage', score: 70 }] },
  { sku: 'BRI-010', name: 'Rabot électrique 82 mm 850W', description: 'Rabot électrique Bosch GHO 40-82 C, largeur de rabotage 82 mm, profondeur max 4 mm. Système d\'éjection réversible.', category: 'Bricolage', brand: 'Bosch', price: 299.00, stock: 9, specs: { puissance: '850W', largeur: '82 mm', profondeur_max: '4 mm', poids: '3.2 kg' }, usages: [{ code: 'coupe_bois', score: 75 }, { code: 'poncage', score: 45 }] },

  // ===== ÉLECTROMÉNAGER =====
  { sku: 'ELE-001', name: 'Aspirateur robot connecté', description: 'Aspirateur robot iRobot Roomba j7+, navigation PrecisionVision, vidage automatique, compatible Alexa et Google Home.', category: 'Électroménager', brand: 'iRobot', price: 599.99, stock: 20, specs: { autonomie: '75 min', capacite_bac: '0.4L', navigation: 'PrecisionVision', wifi: true }, usages: [{ code: 'nettoyage_sol', score: 98 }] },
  { sku: 'ELE-002', name: 'Aspirateur traîneau sans sac', description: 'Aspirateur Dyson Big Ball Multifloor 2, technologie cyclone, brosse double usage sols durs/moquette, filtre HEPA.', category: 'Électroménager', brand: 'Dyson', price: 349.00, stock: 35, specs: { puissance_aspiration: '250 AW', capacite: '1.63L', filtre: 'HEPA', rayon_action: '10 m' }, usages: [{ code: 'nettoyage_sol', score: 95 }] },
  { sku: 'ELE-003', name: 'Lave-vaisselle encastrable 60 cm', description: 'Lave-vaisselle Bosch SMS6ZDW48E, 14 couverts, programme Silence 42 dB, séchage PerfectDry Zeolith.', category: 'Électroménager', brand: 'Bosch', price: 849.00, stock: 10, specs: { couverts: 14, bruit: '42 dB', programmes: 8, classe_energie: 'A', largeur: '60 cm' }, usages: [{ code: 'nettoyage_sol', score: 10 }] },
  { sku: 'ELE-004', name: 'Four micro-ondes combiné 25L', description: 'Micro-ondes combiné Samsung MC28H5015CS, 25L, 900W, grill 1500W, cuisson vapeur, 28 programmes automatiques.', category: 'Électroménager', brand: 'Samsung', price: 179.99, stock: 42, specs: { capacite: '25L', puissance: '900W', grill: '1500W', programmes: 28 }, usages: [{ code: 'cuisson', score: 92 }] },
  { sku: 'ELE-005', name: 'Robot culinaire multifonction', description: 'Robot Moulinex Companion XL, 1550W, bol 4.5L, 12 programmes automatiques, couteau hachoir/pétrisseur/fouet inclus.', category: 'Électroménager', brand: 'Moulinex', price: 699.99, stock: 16, specs: { puissance: '1550W', capacite_bol: '4.5L', programmes: 12, accessoires: 5 }, usages: [{ code: 'cuisson', score: 85 }, { code: 'mixage', score: 70 }] },
  { sku: 'ELE-006', name: 'Machine à café automatique', description: 'Machine à café De\'Longhi Magnifica S, broyeur intégré, buse vapeur cappuccino, écran digital, 2 tasses simultanées.', category: 'Électroménager', brand: 'De\'Longhi', price: 449.00, stock: 25, specs: { pression: '15 bar', reservoir: '1.8L', broyeur: 'acier inoxydable', programmes: 4 }, usages: [{ code: 'cuisson', score: 30 }] },
  { sku: 'ELE-007', name: 'Sèche-linge pompe à chaleur 8 kg', description: 'Sèche-linge Samsung DV80TA020AE, 8 kg, pompe à chaleur, classe A++, programme délicat, tambour réversible.', category: 'Électroménager', brand: 'Samsung', price: 599.00, stock: 8, specs: { capacite: '8 kg', classe_energie: 'A++', bruit: '65 dB', programmes: 14 }, usages: [{ code: 'lavage_linge', score: 80 }] },
  { sku: 'ELE-008', name: 'Lave-linge frontal 9 kg', description: 'Lave-linge LG F94V35WHS, 9 kg, 1400 tr/min, vapeur Steam+, moteur Inverter Direct Drive garanti 10 ans.', category: 'Électroménager', brand: 'LG', price: 549.00, stock: 14, specs: { capacite: '9 kg', essorage: '1400 tr/min', classe_energie: 'A', bruit: '52 dB' }, usages: [{ code: 'lavage_linge', score: 98 }] },
  { sku: 'ELE-009', name: 'Congélateur coffre 300L', description: 'Congélateur coffre Liebherr GTP 2756, 300L, classe A+++, SuperFrost, alarme température, 2 paniers.', category: 'Électroménager', brand: 'Liebherr', price: 699.00, stock: 6, specs: { capacite: '300L', classe_energie: 'A+++', temperature: '-18°C à -38°C', bruit: '38 dB' }, usages: [{ code: 'conservation', score: 98 }] },
  { sku: 'ELE-010', name: 'Purificateur d\'air HEPA 50 m²', description: 'Purificateur Philips AC2889/10, filtre HEPA NanoProtect, capteur qualité d\'air intelligent, mode nuit silencieux.', category: 'Électroménager', brand: 'Philips', price: 349.90, stock: 19, specs: { surface: '50 m²', filtre: 'HEPA NanoProtect', debit_air: '333 m³/h', bruit: '20-51 dB' }, usages: [{ code: 'nettoyage_sol', score: 30 }] },

  // ===== PARFUMERIE / COSMÉTIQUES =====
  { sku: 'PAR-001', name: 'Eau de Toilette Homme Sauvage 100 ml', description: 'Dior Sauvage Eau de Toilette, notes de bergamote de Calabre et poivre de Sichuan, sillage puissant et frais.', category: 'Parfumerie', brand: 'Dior', price: 109.00, stock: 50, specs: { contenance: '100 ml', type: 'Eau de Toilette', famille_olfactive: 'Aromatique ambré', genre: 'Homme' }, usages: [{ code: 'parfum', score: 98 }] },
  { sku: 'PAR-002', name: 'Eau de Parfum Femme N°5 50 ml', description: 'Chanel N°5 Eau de Parfum, bouquet floral aldéhydé iconique, notes de rose de mai et jasmin de Grasse.', category: 'Parfumerie', brand: 'Chanel', price: 135.00, stock: 40, specs: { contenance: '50 ml', type: 'Eau de Parfum', famille_olfactive: 'Floral aldéhydé', genre: 'Femme' }, usages: [{ code: 'parfum', score: 98 }] },
  { sku: 'PAR-003', name: 'Crème hydratante visage 50 ml', description: 'Lancôme Hydra Zen crème hydratante apaisante, acide hyaluronique et extrait de rose, tous types de peau.', category: 'Parfumerie', brand: 'Lancôme', price: 54.90, stock: 65, specs: { contenance: '50 ml', type_peau: 'Tous types', ingredients_cles: ['acide hyaluronique', 'extrait de rose'], SPF: 'non' }, usages: [{ code: 'soin_peau', score: 95 }] },
  { sku: 'PAR-004', name: 'Sérum anti-âge Advanced Génifique 30 ml', description: 'Lancôme Advanced Génifique, sérum activateur de jeunesse, 10 probiotiques, résultats visibles en 7 jours.', category: 'Parfumerie', brand: 'Lancôme', price: 79.90, stock: 30, specs: { contenance: '30 ml', actifs: ['probiotiques', 'acide hyaluronique'], type: 'Sérum', genre: 'Mixte' }, usages: [{ code: 'soin_peau', score: 97 }] },
  { sku: 'PAR-005', name: 'Fond de teint longue tenue 30 ml', description: 'Estée Lauder Double Wear, fond de teint longue tenue 24h, fini mat, couvrance moyenne à complète, anti-transfert.', category: 'Parfumerie', brand: 'Estée Lauder', price: 47.50, stock: 55, specs: { contenance: '30 ml', fini: 'Mat', tenue: '24h', couvrance: 'Moyenne à complète', SPF: '10' }, usages: [{ code: 'maquillage', score: 95 }] },
  { sku: 'PAR-006', name: 'Rouge à lèvres mat Rouge Allure', description: 'Chanel Rouge Allure Velvet, rouge à lèvres mat lumineux, texture crémeuse, tenue longue durée.', category: 'Parfumerie', brand: 'Chanel', price: 42.00, stock: 70, specs: { contenance: '3.5g', fini: 'Mat velours', type: 'Rouge à lèvres' }, usages: [{ code: 'maquillage', score: 93 }] },
  { sku: 'PAR-007', name: 'Mascara Volume Hypnôse', description: 'Lancôme Hypnôse mascara volume sur mesure, brosse innovante S, enrichi en vitamine B5.', category: 'Parfumerie', brand: 'Lancôme', price: 33.50, stock: 80, specs: { contenance: '6.2 ml', type: 'Mascara volume', couleur: 'Noir intense', waterproof: false }, usages: [{ code: 'maquillage', score: 90 }] },
  { sku: 'PAR-008', name: 'Huile essentielle Lavande Bio 15 ml', description: 'Huile essentielle de lavande fine bio Puressentiel, 100% pure et naturelle, relaxante et apaisante.', category: 'Parfumerie', brand: 'Puressentiel', price: 12.90, stock: 100, specs: { contenance: '15 ml', bio: true, type: 'Huile essentielle', plante: 'Lavandula angustifolia' }, usages: [{ code: 'soin_corps', score: 80 }, { code: 'parfum', score: 40 }] },
  { sku: 'PAR-009', name: 'Gel douche luxe Rose Absolue 500 ml', description: 'Gel douche Roger & Gallet Rose Absolue, formule enrichie en aloe vera et extrait de rose de Damas.', category: 'Parfumerie', brand: 'Roger & Gallet', price: 14.90, stock: 90, specs: { contenance: '500 ml', parfum: 'Rose de Damas', type: 'Gel douche', vegan: true }, usages: [{ code: 'soin_corps', score: 95 }] },
  { sku: 'PAR-010', name: 'Coffret beauté Trésor', description: 'Coffret Lancôme Trésor : Eau de Parfum 30 ml + Lait corps 50 ml + Gel douche 50 ml, écrin cadeau.', category: 'Parfumerie', brand: 'Lancôme', price: 69.90, stock: 25, specs: { contenu: ['EDP 30ml', 'Lait corps 50ml', 'Gel douche 50ml'], type: 'Coffret', genre: 'Femme' }, usages: [{ code: 'parfum', score: 85 }, { code: 'soin_corps', score: 60 }] },

  // ===== CUISINE =====
  { sku: 'CUI-001', name: 'Couteau de chef japonais 20 cm', description: 'Couteau de chef Zwilling Pro, lame forgée 20 cm en acier inoxydable spécial, manche ergonomique.', category: 'Cuisine', brand: 'Zwilling', price: 99.90, stock: 40, specs: { longueur_lame: '20 cm', materiau: 'Acier inoxydable Friodur', durete: '57 HRC', poids: '230 g' }, usages: [{ code: 'decoupe', score: 98 }] },
  { sku: 'CUI-002', name: 'Poêle antiadhésive 28 cm', description: 'Poêle Tefal Ingenio Expertise 28 cm, revêtement Titanium Excellence, compatible tous feux dont induction.', category: 'Cuisine', brand: 'Tefal', price: 39.90, stock: 60, specs: { diametre: '28 cm', revetement: 'Titanium Excellence', induction: true, poignee: 'amovible' }, usages: [{ code: 'cuisson_cuisine', score: 97 }] },
  { sku: 'CUI-003', name: 'Cocotte en fonte ronde 26 cm', description: 'Cocotte Le Creuset Signature ronde 26 cm, fonte émaillée, couvercle auto-arroseur, 5.3L.', category: 'Cuisine', brand: 'Le Creuset', price: 299.00, stock: 15, specs: { diametre: '26 cm', capacite: '5.3L', materiau: 'Fonte émaillée', poids: '4.7 kg', induction: true }, usages: [{ code: 'cuisson_cuisine', score: 98 }] },
  { sku: 'CUI-004', name: 'Mixeur plongeant 1000W', description: 'Mixeur plongeant Braun MultiQuick 9, technologie ACTIVEBlade, 1000W, pied en acier inox, accessoires hachoir/fouet.', category: 'Cuisine', brand: 'Braun', price: 89.90, stock: 35, specs: { puissance: '1000W', vitesse: '13 600 tr/min', materiau_pied: 'Acier inoxydable', accessoires: ['hachoir', 'fouet', 'bol'] }, usages: [{ code: 'mixage', score: 97 }, { code: 'decoupe', score: 30 }] },
  { sku: 'CUI-005', name: 'Mandoline de cuisine inox', description: 'Mandoline de Buyer Kobra, 3 épaisseurs de coupe, lame en V inox, pieds antidérapants, poussoir de sécurité.', category: 'Cuisine', brand: 'de Buyer', price: 59.90, stock: 28, specs: { lame: 'Acier inoxydable V', epaisseurs: '1.5 / 3 / 5 mm', materiau: 'Inox et ABS', securite: 'Poussoir inclus' }, usages: [{ code: 'decoupe', score: 92 }] },
  { sku: 'CUI-006', name: 'Balance de cuisine précision 5 kg', description: 'Balance Joseph Joseph TriScale, précision 1 g, plateau pliable compact, écran LCD, portée 5 kg.', category: 'Cuisine', brand: 'Joseph Joseph', price: 34.90, stock: 50, specs: { portee: '5 kg', precision: '1 g', affichage: 'LCD', piles: '2 x CR2032' }, usages: [{ code: 'pesage', score: 98 }] },
  { sku: 'CUI-007', name: 'Planche à découper bois d\'acacia', description: 'Planche à découper Zwilling en bois d\'acacia massif, 60 x 40 cm, épaisseur 3 cm, rigole à jus.', category: 'Cuisine', brand: 'Zwilling', price: 49.90, stock: 33, specs: { dimensions: '60 x 40 x 3 cm', materiau: 'Bois d\'acacia', entretien: 'Huile minérale', rigole: true }, usages: [{ code: 'decoupe', score: 70 }] },
  { sku: 'CUI-008', name: 'Batteur électrique 450W 5 vitesses', description: 'Batteur KitchenAid 5KHM9212, 450W, 9 vitesses, fouets et crochets pétrisseurs, démarrage progressif.', category: 'Cuisine', brand: 'KitchenAid', price: 99.00, stock: 22, specs: { puissance: '450W', vitesses: 9, accessoires: ['2 fouets', '2 crochets'], poids: '1.1 kg' }, usages: [{ code: 'mixage', score: 93 }] },
  { sku: 'CUI-009', name: 'Bouilloire électrique inox 1.7L', description: 'Bouilloire Smeg KLF04CREU, 1.7L, acier inoxydable, température réglable 50-100°C, design rétro années 50.', category: 'Cuisine', brand: 'Smeg', price: 149.90, stock: 26, specs: { capacite: '1.7L', puissance: '2400W', temperatures: '50-100°C', materiau: 'Acier inoxydable' }, usages: [{ code: 'cuisson_cuisine', score: 40 }] },
  { sku: 'CUI-010', name: 'Machine sous vide alimentaire', description: 'Machine sous vide FoodSaver FFS006X, soudure 30 cm, aspiration automatique, compartiment rouleaux intégré.', category: 'Cuisine', brand: 'FoodSaver', price: 119.00, stock: 17, specs: { largeur_soudure: '30 cm', modes: ['sec', 'humide'], pression: '-0.6 bar', accessoires: ['rouleaux', 'sacs'] }, usages: [{ code: 'conservation', score: 85 }, { code: 'cuisson_cuisine', score: 25 }] },

  // ===== JARDIN =====
  { sku: 'JAR-001', name: 'Tondeuse électrique sans fil 36V', description: 'Tondeuse Gardena PowerMax Li-40/37, coupe 37 cm, bac 45L, 5 hauteurs de coupe 20-60 mm, batterie 36V 4Ah.', category: 'Jardin', brand: 'Gardena', price: 399.00, stock: 12, specs: { largeur_coupe: '37 cm', bac: '45L', hauteurs: '20-60 mm', batterie: '36V 4Ah', surface: '400 m²' }, usages: [{ code: 'tonte', score: 98 }] },
  { sku: 'JAR-002', name: 'Taille-haie télescopique 500W', description: 'Taille-haie Husqvarna 520iHE3, lame 50 cm, angle réglable, système anti-vibration LowVib.', category: 'Jardin', brand: 'Husqvarna', price: 279.00, stock: 14, specs: { lame: '50 cm', ecartement_dents: '34 mm', poids: '4.7 kg', angle: 'réglable 0-135°' }, usages: [{ code: 'taille_haie', score: 98 }] },
  { sku: 'JAR-003', name: 'Tuyau d\'arrosage extensible 30 m', description: 'Tuyau Gardena Comfort FLEX 30 m, diamètre 13 mm, résistant 25 bar, anti-torsion, raccords rapides.', category: 'Jardin', brand: 'Gardena', price: 49.90, stock: 55, specs: { longueur: '30 m', diametre: '13 mm', pression_max: '25 bar', temperature: '-20 à 65°C' }, usages: [{ code: 'arrosage', score: 98 }] },
  { sku: 'JAR-004', name: 'Sécateur professionnel bypass', description: 'Sécateur Felco 2, coupe franche, lame acier trempé, poignée aluminium forgé, vis de réglage micro-métrique.', category: 'Jardin', brand: 'Felco', price: 54.90, stock: 45, specs: { type_coupe: 'Bypass', diametre_coupe: '25 mm', longueur: '21.5 cm', poids: '240 g' }, usages: [{ code: 'taille_haie', score: 60 }] },
  { sku: 'JAR-005', name: 'Composteur de jardin 600L', description: 'Composteur Garantia Thermo-King 600L, double paroi isolante, trappe de récupération, montage sans outil.', category: 'Jardin', brand: 'Garantia', price: 89.90, stock: 20, specs: { capacite: '600L', dimensions: '80 x 80 x 104 cm', materiau: 'Polypropylène recyclé', isolation: 'Double paroi' }, usages: [{ code: 'amenagement_ext', score: 75 }] },
  { sku: 'JAR-006', name: 'Abri de jardin bois 9 m²', description: 'Abri de jardin Blooma Solway en pin traité autoclave, 9 m², double porte, plancher inclus, épaisseur 19 mm.', category: 'Jardin', brand: 'Blooma', price: 1299.00, stock: 4, specs: { surface: '9 m²', materiau: 'Pin traité autoclave', epaisseur: '19 mm', hauteur_faitage: '2.34 m' }, usages: [{ code: 'amenagement_ext', score: 95 }] },
  { sku: 'JAR-007', name: 'Barbecue gaz 4 brûleurs', description: 'Barbecue Weber Spirit E-330, 4 brûleurs + réchaud latéral, grille en fonte émaillée, allumage piézo.', category: 'Jardin', brand: 'Weber', price: 749.00, stock: 8, specs: { bruleurs: 4, surface_cuisson: '3744 cm²', puissance: '12.8 kW', materiau_grille: 'Fonte émaillée' }, usages: [{ code: 'cuisson_cuisine', score: 60 }, { code: 'amenagement_ext', score: 50 }] },
  { sku: 'JAR-008', name: 'Parasol déporté 3x3 m', description: 'Parasol déporté Hesperide Élea 3x3 m, toile déperlante 250 g/m², inclinable, rotation 360°, manivelle.', category: 'Jardin', brand: 'Hesperide', price: 249.00, stock: 11, specs: { dimensions: '3 x 3 m', toile: '250 g/m² polyester', mat: 'Aluminium', rotation: '360°', UPF: '50+' }, usages: [{ code: 'amenagement_ext', score: 85 }] },
  { sku: 'JAR-009', name: 'Salon de jardin résine tressée 5 places', description: 'Salon Allibert California 5 places, résine tressée imitation rotin, coussins inclus, table basse intégrée.', category: 'Jardin', brand: 'Allibert', price: 599.00, stock: 7, specs: { places: 5, materiau: 'Résine tressée', coussins: 'Polyester', table: '68 x 68 cm' }, usages: [{ code: 'amenagement_ext', score: 92 }] },
  { sku: 'JAR-010', name: 'Brouette acier galvanisé 100L', description: 'Brouette Haemmerlin Aktiv Premium, caisse acier galvanisé 100L, roue gonflable, charge max 200 kg.', category: 'Jardin', brand: 'Haemmerlin', price: 89.00, stock: 18, specs: { capacite: '100L', charge_max: '200 kg', roue: 'Gonflable Ø 400 mm', materiau: 'Acier galvanisé' }, usages: [{ code: 'amenagement_ext', score: 40 }, { code: 'tonte', score: 20 }] },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function main() {
  console.log('Seeding database...');

  // 1. Create test store
  const store = await prisma.store.upsert({
    where: { apiKey: 'test-api-key' },
    update: { name: 'Boutique Test Shimmer' },
    create: {
      name: 'Boutique Test Shimmer',
      apiKey: 'test-api-key',
      config: {
        locale: 'fr-FR',
        currency: 'EUR',
        features: ['search', 'chat', 'mail', 'sav'],
      },
    },
  });
  console.log(`  Store: ${store.name} (id=${store.id})`);

  // 2. Upsert usage taxonomy
  const usageMap = new Map<string, number>();
  for (const entry of usageTaxonomyEntries) {
    const usage = await prisma.usageTaxonomy.upsert({
      where: { code: entry.code },
      update: {
        label: entry.label,
        category: entry.category,
        keywords: entry.keywords,
        description: entry.description,
        parentCode: entry.parentCode ?? null,
        sortOrder: entry.sortOrder,
      },
      create: entry,
    });
    usageMap.set(usage.code, usage.id);
  }
  console.log(`  UsageTaxonomy: ${usageMap.size} entries upserted`);

  // 3. Upsert products and link usages
  let productCount = 0;
  let usageLinkCount = 0;

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: {
        sku_storeId: { sku: p.sku, storeId: store.id },
      },
      update: {
        name: p.name,
        description: p.description,
        category: p.category,
        brand: p.brand,
        price: p.price,
        stock: p.stock,
        stockStatus: p.stock > 0 ? 'in_stock' : 'out_of_stock',
        specs: p.specs,
        isActive: true,
      },
      create: {
        storeId: store.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        brand: p.brand,
        price: p.price,
        stock: p.stock,
        stockStatus: p.stock > 0 ? 'in_stock' : 'out_of_stock',
        specs: p.specs,
        isActive: true,
      },
    });
    productCount++;

    // Link product <-> usages
    for (const u of p.usages) {
      const usageId = usageMap.get(u.code);
      if (!usageId) {
        console.warn(`    Warning: usage code "${u.code}" not found in taxonomy — skipping`);
        continue;
      }
      await prisma.productUsage.upsert({
        where: {
          productId_usageId: { productId: product.id, usageId },
        },
        update: {
          score: u.score,
          confidence: u.score >= 80 ? 'high' : u.score >= 50 ? 'medium' : 'low',
          source: 'seed',
        },
        create: {
          productId: product.id,
          usageId,
          score: u.score,
          confidence: u.score >= 80 ? 'high' : u.score >= 50 ? 'medium' : 'low',
          source: 'seed',
        },
      });
      usageLinkCount++;
    }
  }

  console.log(`  Products: ${productCount} upserted`);
  console.log(`  ProductUsages: ${usageLinkCount} links upserted`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
