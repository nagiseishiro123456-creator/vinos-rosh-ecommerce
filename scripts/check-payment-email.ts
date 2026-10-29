import { inspectPaymentEmailSetup } from "../src/modules/notifications/email-config";

// Local inspection only: never imports the database or performs an HTTP request.
console.log(JSON.stringify(inspectPaymentEmailSetup(process.env), null, 2));
