// @ts-check
/**
 * Dutch translations for List&GO.
 * Business Logic: All user-facing text in one place so a second language
 * can be added by copying this file and translating the values.
 * @module
 */

/** @type {{ [key: string]: any }} */
const STRINGS_NL = {
  // App shell / navigation
  app: {
    title: "List&GO – Boodschappen & Maaltijdplanner",
    description: "Een local-first, offline-first PWA voor boodschappenlijsten en maaltijdplanning.",
  },
  nav: {
    lists: "Lijsten",
    plan: "Planning",
    recipes: "Recepten",
    items: "Items",
  },

  // Grocery List
  grocery: {
    pageTitle: "Boodschappenlijst",
    emptyState: "Je boodschappenlijst is leeg. Voeg items toe of plan maaltijden om te beginnen.",
    completed: "AFGEROND",
    everyWeek: "ELKE WEEK",
    clearAll: "ALLES WISSEN",
    searchPlaceholder: "Melk, eieren, brood toevoegen...",
    essentialsHeading: "Wekelijkse Boodschappen",
    essentialsSubtitle: "Voeg snel items toe die je elke week koopt.",
    essentialsEmpty: "Nog geen vaste boodschappen. Voeg ze toe bij Items.",
    cancel: "Annuleren",
    addSelected: "Toevoegen",
    addedToGroceryList: "{name} toegevoegd aan Boodschappenlijst",
    removed: "{name} verwijderd",
    restored: "{name} hersteld",
    clearAllHeading: "Hele lijst wissen?",
    clearAllMessage: "Dit verwijdert alle items (aangevinkt en niet aangevinkt) uit je lijst. Dit kan niet ongedaan worden gemaakt.",
    clearAllConfirm: "Lijst Wissen",
    clearAllCancel: "Lijst Houden",
    deleteItemAria: "Item verwijderen",
  },

  // Settings
  settings: {
    title: "Instellingen",
    tabs: { account: "ACCOUNT", store: "WINKEL", recipe: "RECEPT", items: "ITEMS" },
    account: {
      heading: "Accountbeheer",
      update: "BIJWERKEN",
      delete: "VERWIJDEREN",
      familyHeading: "Gezin & Huishouden",
      invite: "LID UITNODIGEN",
      admin: "Beheerder",
      member: "Lid",
      moreOptions: "Meer opties",
      resetHeading: "Resetten",
      resetDescription: "Alle gegevens terugzetten naar fabrieksinstellingen",
      resetBtn: "TERUGZETTEN",
      language: "Taal",
    },
    store: {
      heading: "Winkellay-out",
      categoryOrder: "Categorievolgorde",
      moveUp: "Verplaats {name} omhoog",
      moveDown: "Verplaats {name} omlaag",
      dragToReorder: "Sleep om te herschikken",
    },
    recipe: {
      heading: "Recept standaardwaarden",
      defaultPersons: "Standaard aantal personen",
      categoriesHeading: "Receptcategorieën",
      addPlaceholder: "Receptcategorie toevoegen",
      addAria: "Receptcategorie toevoegen",
      renamePrompt: "Categorie hernoemen:",
      deleteConfirm: "Deze receptcategorie verwijderen?",
    },
    items: {
      categoriesHeading: "Itemcategorieën",
      colorPickerAria: "Kleur wijzigen voor {name}",
      deleteAria: "Categorie verwijderen",
      deleteRecipeAria: "Receptcategorie verwijderen",
      addPlaceholder: "Categorie toevoegen",
      addAria: "Categorie toevoegen",
    },
    resetConfirm: "Alle gegevens terugzetten naar fabrieksinstellingen? Dit kan niet ongedaan worden gemaakt.",
    resetSnackbar: "Gegevens teruggezet naar standaardwaarden",
    saveAll: "Alle Wijzigingen Opslaan",
    close: "Instellingen sluiten",
  },

  // Recipe Detail
  recipeDetail: {
    title: "Receptdetails",
    edit: "Bewerk",
    category: "Categorie",
    prepTime: "Bereidingstijd",
    serves: "Porties",
    source: "Bron",
    ingredients: "Ingrediënten",
    items: "{count} Items",
    persons: "{count} personen",
    notFound: "Recept niet gevonden.",
    loadError: "Kon receptdetails niet laden.",
  },

  // Recipe Editor
  recipeEditor: {
    addTitle: "Recept Toevoegen",
    editTitle: "Recept Bewerken",
    save: "Opslaan",
    delete: "Verwijder",
    form: {
      name: "Receptnaam",
      namePlaceholder: "Receptnaam",
      description: "Beschrijving",
      descriptionPlaceholder: "Korte beschrijving...",
      category: "Categorie",
      categorySelect: "Selecteer…",
      prepTime: "Bereidingstijd (min)",
      serves: "Porties",
      sourceUrl: "Bron-URL",
      sourcePlaceholder: "https://...",
      ingredients: "Ingrediënten",
      addIngredientPlaceholder: "Ingrediënt toevoegen...",
      removeAria: "Ingrediënt verwijderen",
      items: "{count} Items",
    },
  },

  // Meal Planner
  mealPlan: {
    pageTitle: "Maaltijdplanning",
    clearAll: "ALLES WISSEN",
    cookedDivider: "Gekookt",
    recipeDeleted: "Recept verwijderd",
    emptyState: "Nog geen maaltijden gepland. Voeg recepten toe via het Recepten-tabblad.",
    loadError: "Kon maaltijdplanning niet laden. Probeer opnieuw.",
    clearAllHeading: "Hele maaltijdplanning wissen?",
    clearAllMessage: "Dit verwijdert alle geplande maaltijden en hun ingrediënten uit de boodschappenlijst. Dit kan niet ongedaan worden gemaakt.",
    clearAllConfirm: "Planning Wissen",
    clearAllCancel: "Planning Houden",
    clearSnackbar: "Maaltijdplanning gewist",
    addToGrocery: "Toevoegen aan boodschappenlijst",
    removeFromGrocery: "{name} verwijderd van Boodschappenlijst",
    addedToGrocery: "{name} toegevoegd aan Boodschappenlijst",
    removedFromPlan: "{name} verwijderd uit Planning",
    restoredToPlan: "{name} hersteld",
    servingsUpdate: "{name} → {count} personen",
    ingredientModal: {
      heading: "Voeg {name} toe",
      subtitle: "Selecteer ingrediënten om aan je boodschappenlijst toe te voegen.",
      singleUse: "Ingrediënten (eenmalig gebruik)",
      multiUse: "Ingrediënten (meermalig gebruik)",
      cancel: "Annuleren",
      addSelected: "Toevoegen",
    },
    markCooked: "Markeer als gekookt",
    unmarkCooked: "Markeer als niet gekookt",
    toggleGrocery: "Boodschappenlijst aan/uit",
    deleteAria: "Maaltijdplan verwijderen",
  },

  // Items Library
  itemsLibrary: {
    pageTitle: "Itemlijst",
    searchPlaceholder: "Ingrediënten of categorieën doorzoeken...",
    essentials: "ESSENTIEEL",
    emptyState: "Nog geen items. Tik '+ Nieuw' om je eerste item toe te voegen.",
    loadError: "Kon items niet laden. Is de database gereed?",
    noMatch: "Geen items gevonden voor je zoekopdracht of filter.",
    addedToGroceryList: "{name} toegevoegd aan Boodschappenlijst",
    multiUse: "Meermalig gebruik",
    addToList: "Voeg {name} toe aan lijst",
    toast: "Toegevoegd aan Boodschappenlijst",
  },

  // Item Editor
  itemEditor: {
    addTitle: "Nieuw Item",
    editTitle: "Item Bewerken",
    save: "Wijzigingen Opslaan",
    cancel: "Annuleren",
    delete: "ITEM VERWIJDEREN",
    duplicate: "Item Dupliceren",
    toggleEssentialAria: "Essentieel aan/uit",
    decreaseQtyAria: "Hoeveelheid verlagen",
    increaseQtyAria: "Hoeveelheid verhogen",
    form: {
      name: "Item Naam",
      namePlaceholder: "bijv. Volle Melk",
      category: "Categorie",
      categorySelect: "Selecteer…",
      unit: "Eenheid",
      unitPlaceholder: "gram, pcs, ml…",
      otherUnit: "Anders…",
      defaultQty: "Standaardhoeveelheid",
      isEssential: "Wekelijks Essentieel",
      isEssentialHelp: "Automatisch toevoegen aan nieuwe lijsten",
      isMultiUse: "Meermalig gebruik",
      isMultiUseHelp: "Gaat langer dan één maaltijd mee",
    },
    saved: "{name} opgeslagen",
  },

  // Confirm Dialog
  confirmDialog: {
    defaultConfirm: "Bevestigen",
    defaultCancel: "Annuleren",
  },

  // Content Dialog
  contentDialog: {
    closeAria: "Sluiten",
  },

  // Snackbar
  snackbar: {
    undo: "Ongedaan maken",
  },

  // Top Bar
  topBar: {
    settingsAria: "Instellingen openen",
  },

  // Router / page titles
  pageTitles: {
    lists: "Boodschappenlijst",
    plan: "Maaltijdplanning",
    recipes: "Recepten",
    items: "Itemlijst",
    settings: "Instellingen",
  },

  // General / shared
  general: {
    new: "+ Nieuw",
    close: "Sluiten",
  },

  // Color names for category color picker in settings
  colorNames: {
    "#2D6A4F": "Donker Bosgroen",
    "#4895EF": "Zacht Cerulean Blauw",
    "#D4A373": "Warm Geroosterd Beige",
    "#BC4749": "Gedempt Karmijnrood",
    "#7F5539": "Aards Kaneelbruin",
    "#4CC9F0": "Helder Hemelblauw",
    "#F72585": "Levendig Bessenroze",
    "#FB8B24": "Vurig Zonsondergang Oranje",
    "#7209B7": "Diep Koningspaars",
    "#B5179E": "Rijke Pruim Magenta",
    "#3F37C9": "Vet Indigo Blauw",
    "#48BFE3": "Zacht Aquamarijn",
    "#8338EC": "Helder Lavendelpaars",
    "#FFBE0B": "Goud Ambergeel",
  },
};

export default STRINGS_NL;