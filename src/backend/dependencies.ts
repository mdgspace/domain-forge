import { Application, Router, Context } from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { config } from 'https://deno.land/x/dotenv@v3.2.2/mod.ts';

config({ export: true });

export { Application, Router, Context, config}