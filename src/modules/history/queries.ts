import { cache } from "react";
import { readHistory } from "./store";
export const getHistory = cache(readHistory);
