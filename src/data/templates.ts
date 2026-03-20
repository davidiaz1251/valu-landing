export type UserRole = 'cliente_final' | 'profesional_reposteria' | 'admin';

export type TemplateItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  format: string;
  storagePath: string;
  requiredRoles: UserRole[];
  featured?: boolean;
};

export const templates: TemplateItem[] = [
  {
    id: 'tpl-n8n-001',
    title: 'Pack de plantillas (ZIP)',
    category: 'Plantillas',
    description: 'Archivo de prueba para validar descarga.',
    format: 'ZIP',
    storagePath: 'n8n.zip',
    requiredRoles: ['cliente_final', 'profesional_reposteria', 'admin'],
    featured: true,
  },
];
