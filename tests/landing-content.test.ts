import {strict as assert} from "node:assert";
import {test} from "node:test";
import {resolveLandingCopy,landingCopySchema} from "../src/modules/products/landing-content";
test("legacy products and draft copy retain defaults without leaking malformed values",()=>{
 const legacy=resolveLandingCopy(null,{description:"Origen guardado previamente"});assert.equal(legacy.origin,"Origen guardado previamente");
 const original=resolveLandingCopy(null);assert.match(original.headline,/Una sola botella/);
 const changed=resolveLandingCopy({headline:"Nuevo título\nSegunda línea",origin:42,subtitle:""});
 assert.equal(changed.headline,"Nuevo título\nSegunda línea");assert.equal(changed.origin,original.origin);assert.equal(changed.subtitle,original.subtitle);
});
test("editable landing accepts plain text and rejects oversized or missing content before storage",()=>{
 const copy=resolveLandingCopy(null);assert.equal(landingCopySchema.safeParse({...copy,headline:"<script>texto del cliente</script>"}).success,true);
 assert.equal(landingCopySchema.safeParse({...copy,headline:"x".repeat(1001)}).success,false);
 assert.equal(landingCopySchema.safeParse({...copy,origin:""}).success,false);
});
