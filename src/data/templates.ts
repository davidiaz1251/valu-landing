export type TemplateItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  format: string;
  downloadUrl: string;
  featured?: boolean;
};

// Flujo operativo: el owner envia la plantilla por chat y el agente actualiza esta lista.
export const templates: TemplateItem[] = [];
