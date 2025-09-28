// src/utils/categoryIcons.jsx

import React from 'react';
import { 
  ChefHat, Droplet, Bath, Shirt, 
  Bed, Refrigerator, Sofa, Armchair, RockingChair, RotateCcw, Utensils, 
  Book, Monitor, PackageOpen, Umbrella, Sun, Package
} from 'lucide-react';
import { GiConsoleController } from "react-icons/gi";

// Import your custom SVG icons - adjust paths based on your project structure
import TableIcon from '../assets/icons/table-icon.svg';
import FloorSizeIcon from '../assets/icons/area-floor-size-icon.svg';
import SinkIcon from '../assets/icons/sink-wash-basin-icon.svg';
import ClosetIcon from '../assets/icons/closet-wardrobe-icon.svg';
import PillowIcon from '../assets/icons/pillow-icon.svg';
import StoolIcon from '../assets/icons/stool-icon.svg';
import CabinetIcon from '../assets/icons/cabinet-icon.svg';
import DecorationIcon from '../assets/icons/decoration-icon.svg';
import BenchIcon from '../assets/icons/bench-furniture-icon.svg';

// Helper component for custom SVG icons with consistent styling
const CustomSVGIcon = ({ src, alt, className = "w-5 h-5" }) => (
  <img src={src} alt={alt} className={className} />
);

/**
 * CATEGORY_ICONS - Icon mapping for product categories by name
 * 
 * Usage: Import and use directly in JSX: {CATEGORY_ICONS[categoryName] || <DefaultIcon />}
 * Returns: React JSX element with icon and pre-applied Tailwind classes for consistent styling
 */
export const CATEGORY_ICONS = {
  // Kitchen & Appliances
  "Cuisine": <ChefHat className="w-5 h-5 text-warning" />,
  "Électroménager": <Refrigerator className="w-5 h-5 text-error" />,
  "Frigo américain": <Refrigerator className="w-5 h-5 text-error" />,
  "Plan de travail": <CustomSVGIcon src={FloorSizeIcon} alt="Plan de travail" className="w-5 h-5" />,
  "Plinthe": <CustomSVGIcon src={FloorSizeIcon} alt="Plinthe" className="w-5 h-5" />,
  "Évier": <CustomSVGIcon src={SinkIcon} alt="Évier" className="w-5 h-5 text-info" />, 
  "Mitigeurs": <Droplet className="w-5 h-5 text-info" />, 
  "Dressing": <Shirt className="w-5 h-5 text-purple-500" />, 
  "Salle de bain": <Bath className="w-5 h-5 text-info" />, 
  "Matelas": <Bed className="w-5 h-5 text-success" />, 
  "Sommier": <Bed className="w-5 h-5 text-green-600" />,
  "Lit coffre": <Bed className="w-5 h-5 text-green-700" />, 
  "Lit": <Bed className="w-5 h-5 text-success" />,
  "Tète de lit": <Bed className="w-5 h-5 text-success" />, 
  "Pied de sommier": <Bed className="w-5 h-5 text-green-400" />,
  "Oreiller": <CustomSVGIcon src={PillowIcon} alt="Oreiller" className="w-5 h-5" />, 
  "Couverture": <Bed className="w-5 h-5 text-blue-400" />,
  "Coussin": <CustomSVGIcon src={PillowIcon} alt="Coussin" className="w-5 h-5" />,
  "Drap housse": <Bed className="w-5 h-5 text-blue-600" />,
  "Canapé": <Sofa className="w-5 h-5 text-amber-500" />, 
  "Fauteuil": <Armchair className="w-5 h-5 text-amber-600" />, 
  "Chaise": <RockingChair alt="Chaise" className="w-5 h-5" />, 
  "Chaise+6": <RockingChair alt="Chaise+6" className="w-5 h-5" />, 
  "Tabouret": <CustomSVGIcon src={StoolIcon} alt="Tabouret" className="w-5 h-5" />,
  "Banc": <CustomSVGIcon src={BenchIcon} alt="Banc" className="w-5 h-5" />, 
  "Table de repas": <Utensils className="w-5 h-5 text-brown-500" />, 
  "Table basse": <CustomSVGIcon src={TableIcon} alt="Table basse" className="w-5 h-5" />,
  "Option pivotant": <RotateCcw className="w-5 h-5 text-indigo-500" />,
  "Armoire": <CustomSVGIcon src={ClosetIcon} alt="Armoire" className="w-5 h-5" />,
  "Bibliothèque": <Book className="w-5 h-5 text-indigo-600" />,
  "Buffet": <CustomSVGIcon src={CabinetIcon} alt="Buffet" className="w-5 h-5" />,
  "Bahut": <CustomSVGIcon src={CabinetIcon} alt="Bahut" className="w-5 h-5" />,
  "Enfilade": <CustomSVGIcon src={CabinetIcon} alt="Enfilade" className="w-5 h-5" />,
  "Vitrine": <CustomSVGIcon src={CabinetIcon} alt="Vitrine" className="w-5 h-5" />,
  "Commode": <CustomSVGIcon src={CabinetIcon} alt="Commode" className="w-5 h-5" />,
  "Meubles d'entrée": <CustomSVGIcon src={CabinetIcon} alt="Meubles d'entrée" className="w-5 h-5" />,
  "Meuble télé": <Monitor className="w-5 h-5 text-slate-600" />, 
  "Consoles": <GiConsoleController alt="Consoles" className="w-5 h-5" />,
  "Décoration": <CustomSVGIcon src={DecorationIcon} alt="Décoration" className="w-5 h-5" />,
  "Parasols": <Umbrella className="w-5 h-5 text-blue-500" />,
  "Bain de soleil": <Sun className="w-5 h-5 text-yellow-500" />,
  "SAV": <PackageOpen className="w-5 h-5 text-success" />,
  "Autres": <Package className="w-5 h-5 text-indigo-500" />
};

/**
 * SHOP_CATEGORIES - Static categories configuration with IDs
 * This replaces the need to fetch categories from the API
 */
export const SHOP_CATEGORIES = [
  { id: 1, name: "Cuisine" },
  { id: 2, name: "Électroménager" },
  { id: 3, name: "Plan de travail" },
  { id: 4, name: "Plinthe" },
  { id: 5, name: "Évier" },
  { id: 6, name: "Mitigeurs" },
  { id: 7, name: "Dressing" },
  { id: 8, name: "Salle de bain" },
  { id: 9, name: "Matelas" },
  { id: 10, name: "Sommier" },
  { id: 11, name: "Lit coffre" },
  { id: 12, name: "Tète de lit" },
  { id: 13, name: "Pied de sommier" },
  { id: 14, name: "Oreiller" },
  { id: 15, name: "Couverture" },
  { id: 16, name: "Coussin" },
  { id: 17, name: "Drap housse" },
  { id: 18, name: "Canapé" },
  { id: 19, name: "Fauteuil" },
  { id: 20, name: "Chaise" },
  { id: 21, name: "Tabouret" },
  { id: 22, name: "Option pivotant" },
  { id: 23, name: "Table de repas" },
  { id: 24, name: "Table basse" },
  { id: 25, name: "Armoire" },
  { id: 26, name: "Bibliothèque" },
  { id: 27, name: "Buffet" },
  { id: 28, name: "Bahut" },
  { id: 29, name: "Enfilade" },
  { id: 30, name: "Vitrine" },
  { id: 31, name: "Meuble télé" },
  { id: 32, name: "Commode" },
  { id: 33, name: "Meubles d'entrée" },
  { id: 34, name: "Consoles" },
  { id: 35, name: "Décoration" },
  { id: 36, name: "Banc" },
  { id: 37, name: "Parasols" },
  { id: 38, name: "Bain de soleil" },
  { id: 39, name: "SAV" },
  { id: 40, name: "Autres" },
  { id: 41, name: "Chaise+6" },
  { id: 42, name: "Lit" },
  { id: 43, name: "Frigo américain" }
];

/**
 * Helper function to get category by ID
 */
export const getCategoryById = (id) => {
  return SHOP_CATEGORIES.find(category => category.id === id);
};

/**
 * Helper function to get category icon by ID
 */
export const getCategoryIconById = (id) => {
  const category = getCategoryById(id);
  return category ? CATEGORY_ICONS[category.name] : <Package className="w-5 h-5 text-indigo-500" />;
};