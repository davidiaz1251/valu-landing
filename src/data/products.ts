export type CatalogCategory = {
  id: string;
  title: string;
  description: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  images?: string[];
  customizable?: boolean;
  active?: boolean;
  order?: number;
};

export const catalogCategories: CatalogCategory[] = [
  { id: 'papeleria', title: 'Papelería Creativa', description: 'Invitaciones, cajitas, etiquetas y packaging personalizado.' },
  { id: 'decoracion', title: 'Decoración de Eventos', description: 'Cake toppers y decoración para celebraciones.' },
  { id: 'personalizacion', title: 'Personalización', description: 'Productos personalizados para regalos y marca.' },
  { id: 'encuadernacion', title: 'Encuadernación', description: 'Agendas, cuadernos artesanales y álbumes.' }
];

export const catalogProducts: CatalogProduct[] = [
  {
    id: 'prod-cajitas-personalizadas',
    name: 'Cajitas personalizadas',
    description: 'Para regalos, dulces y eventos.',
    categoryId: 'papeleria',
    customizable: true,
    active: true,
    order: 1
  },
  {
    id: 'prod-invitaciones',
    name: 'Invitaciones temáticas',
    description: 'Bodas, cumpleaños, bautizos y comuniones.',
    categoryId: 'papeleria',
    customizable: true,
    active: true,
    order: 2
  },
  {
    id: 'prod-cake-topper',
    name: 'Cake toppers personalizados',
    description: 'En madera, acrílico o cartulina.',
    categoryId: 'decoracion',
    customizable: true,
    active: true,
    order: 1
  },
  {
    id: 'prod-mesa-dulce',
    name: 'Decoración mesa dulce',
    description: 'Elementos coordinados para tu evento.',
    categoryId: 'decoracion',
    customizable: true,
    active: true,
    order: 2
  },
  {
    id: 'prod-camisetas',
    name: 'Camisetas personalizadas',
    description: 'Con vinilo textil o sublimación.',
    categoryId: 'personalizacion',
    customizable: true,
    active: true,
    order: 1
  },
  {
    id: 'prod-agendas',
    name: 'Agendas personalizadas',
    description: 'Diseño y contenido a tu gusto.',
    categoryId: 'encuadernacion',
    customizable: true,
    active: true,
    order: 1
  }
];

export const WHATSAPP_NUMBER = '34600000000';
export const INSTAGRAM_USERNAME = 'valu_kraft';
