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

// Flujo operativo actual: el owner envía la plantilla por chat y el agente actualiza esta lista.
// Los archivos se suben al bucket de Supabase Storage y aquí se referencia su ruta interna.
export const templates: TemplateItem[] = [
  {
    id: 'tpl-n8n-001',
    title: 'Pack n8n (ZIP)',
    category: 'Automatización',
    description: 'Archivo ZIP de prueba para validar flujo de descarga protegida.',
    format: 'ZIP',
    storagePath: 'n8n.zip',
    requiredRoles: ['cliente_final', 'profesional_reposteria', 'admin'],
    featured: true,
  },
];
