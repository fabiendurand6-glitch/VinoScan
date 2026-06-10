export const getGenericImageForType = (type) => {
    switch(type) {
      case 'BLANC': return "https://images.unsplash.com/photo-1506377847308-cb8f9d0cbdf6?auto=format&fit=crop&w=800&q=80";
      case 'PETILLANT': return "https://images.unsplash.com/photo-1599939571322-792a326cb6ae?auto=format&fit=crop&w=800&q=80";
      case 'ROSE': return "https://images.unsplash.com/photo-1559596355-6bcfcc77112a?auto=format&fit=crop&w=800&q=80";
      default: return "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80"; 
    }
  };
  
  export const getAmazonAffiliateLink = (searchQuery) => `https://www.amazon.fr/s?k=${encodeURIComponent(searchQuery)}&tag=vinoscan-21`;
  
  export const getRecommendedAccessory = (type) => {
    switch(type) {
      case 'ROUGE': return { name: "Carafe à décanter Cristal", search: "carafe a decanter vin rouge cristal" };
      case 'BLANC': return { name: "Seau à glace Design", search: "seau a glace vin inox" };
      case 'PETILLANT': return { name: "Coffret flûtes Prestige", search: "verres flutes champagne cristal" };
      default: return { name: "Tire-bouchon Sommelier", search: "tire bouchon sommelier professionnel" };
    }
  };
  
  export const extractJSON = (text) => {
    try { return JSON.parse(text); } 
    catch (e) {
      const match = text.match(/```json\n([\s\S]*?)\n```/);
      if (match && match[1]) return JSON.parse(match[1]);
      const objMatch = text.match(/\{[\s\S]*\}/);
      if (objMatch) return JSON.parse(objMatch[0]);
      throw new Error("Erreur de lecture de l'intelligence artificielle.");
    }
  };
  
  export const compressImage = (base64Str, maxWidth = 800) => new Promise((resolve) => {
    const img = new window.Image(); img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
  });
  
  export const extractPrice = (priceStr) => {
    if (!priceStr) return 0;
    const match = String(priceStr).match(/\d+([.,]\d+)?/);
    return match ? parseFloat(match[0].replace(',', '.')) : 0;
  };
  
  export const recalculateDates = (anneeStr, baseGardeMin = 2, baseGardeMax = 5) => {
    const currentYear = new Date().getFullYear();
    const millesimeMatch = String(anneeStr).match(/\d{4}/);
    if (!millesimeMatch) return { potentiel_garde: "À consommer rapidement", apogee: "Prêt à boire", declin: "Dans les 2-3 ans", statut_apogee: "APOGEE" };
    const annee = parseInt(millesimeMatch[0], 10);
    const apogeeStart = annee + baseGardeMin;
    const apogeeEnd = annee + baseGardeMax;
    const declinYear = apogeeEnd + 1;
    let statut = "APOGEE";
    if (currentYear < apogeeStart) statut = "A_GARDER";
    else if (currentYear >= declinYear) statut = "DECLIN";
    return { potentiel_garde: `${baseGardeMin} à ${baseGardeMax} ans`, apogee: `${apogeeStart} - ${apogeeEnd}`, declin: `À partir de ${declinYear}`, statut_apogee: statut };
  };
  
  export const normalizeData = (data) => {
    if (!data || typeof data !== 'object') data = {};
    try {
      let safeAccordsMets = Array.isArray(data.accords_mets) ? data.accords_mets.filter(Boolean).map(String) : (data.accords_mets ? [String(data.accords_mets)] : []);
      let nom = data.nom ? String(data.nom) : "Vin inconnu";
      let annee = data.annee ? String(data.annee) : "N.M.";
      let region = data.region ? String(data.region) : "Région inconnue";
      let type = data.type ? String(data.type) : "Vin";
      let description = data.description ? String(data.description) : "Un excellent vin.";
      
      let gardeMin = data.garde_min !== undefined ? Number(data.garde_min) : 2;
      let gardeMax = data.garde_max !== undefined ? Number(data.garde_max) : 5;
      if (!data.garde_min && data.potentiel_garde) {
        const gardeMatches = String(data.potentiel_garde).match(/\d+/g);
        if (gardeMatches && gardeMatches.length >= 1) {
           gardeMin = parseInt(gardeMatches[0], 10);
           gardeMax = gardeMatches.length >= 2 ? parseInt(gardeMatches[1], 10) : gardeMin + 3;
        }
      }
      const dynamicDates = recalculateDates(annee, gardeMin, gardeMax);
  
      let strToSearch = (String(data.type_simplifie || "") + ' ' + type).toUpperCase();
      let type_simplifie = 'AUTRE';
      if (strToSearch.includes('ROUGE')) type_simplifie = 'ROUGE';
      else if (strToSearch.includes('BLANC')) type_simplifie = 'BLANC';
      else if (strToSearch.includes('ROSE') || strToSearch.includes('ROSÉ')) type_simplifie = 'ROSE';
      else if (strToSearch.includes('CHAMPAGNE') || strToSearch.includes('PETILLANT') || strToSearch.includes('PÉTILLANT') || strToSearch.includes('EFFERVESCENT') || strToSearch.includes('CRÉMANT') || strToSearch.includes('CREMANT') || strToSearch.includes('BULLE')) type_simplifie = 'PETILLANT';
      
      if (safeAccordsMets.length === 0) {
        if (type_simplifie === 'ROUGE') safeAccordsMets = ['Viande rouge grillée', 'Plateau de fromages affinés', 'Plats en sauce'];
        else if (type_simplifie === 'BLANC') safeAccordsMets = ['Poissons et fruits de mer', 'Volaille à la crème', 'Fromage de chèvre'];
        else if (type_simplifie === 'ROSE') safeAccordsMets = ['Apéritif', 'Grillades estivales', 'Salades composées'];
        else if (type_simplifie === 'PETILLANT') safeAccordsMets = ['Apéritif', 'Desserts légers', 'Coquilles Saint-Jacques'];
        else safeAccordsMets = ['Plats conviviaux à partager'];
      }
  
      let accord_parfait = data.accord_parfait ? String(data.accord_parfait) : safeAccordsMets[0];
      let safeComparateur = Array.isArray(data.comparateur) ? data.comparateur.filter(Boolean).map(c => typeof c === 'object' ? { site: String(c.site || 'Marchand'), prix: String(c.prix || '?') } : { site: 'Marchand', prix: String(c) }) : [];
      let prix_unitaire_nombre = Number(data.prix_unitaire_nombre) || extractPrice(data.prix_moyen) || 0;
  
      return { 
        nom, annee, region, type, type_simplifie, prix_unitaire_nombre, description, accord_parfait,
        accords_mets: safeAccordsMets, tags_accords: [], comparateur: safeComparateur, baseGardeMin: gardeMin, baseGardeMax: gardeMax, ...dynamicDates
      };
    } catch (e) {
      return { nom: 'Erreur d\'analyse', type_simplifie: 'AUTRE', accords_mets: ['Aucun accord trouvé'], tags_accords: [], comparateur: [] };
    }
  };