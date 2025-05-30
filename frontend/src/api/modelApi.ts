import { Model } from "../utils/types/types";

export const fetchModels = async (): Promise<Model[]> => {
  try {
    const r = await fetch("/api/models");
    const d = await r.json();
    const modelList: Model[] = Array.isArray(d)
      ? d
      : Array.isArray(d.models)
        ? d.models
        : [];

    return modelList;
  } catch (error) {
    console.error(error);
    return [];
  }
};