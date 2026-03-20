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
// Los archivos se suben al bucket de Firebase Storage y aquí se referencia su ruta.
export const templates: TemplateItem[] = [];
