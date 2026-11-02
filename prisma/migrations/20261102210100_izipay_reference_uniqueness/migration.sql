-- PostgreSQL must commit the enum extension before a predicate uses its new value.
CREATE UNIQUE INDEX "Payment_izipay_reference_key" ON "Payment"("externalReference") WHERE "provider"='IZIPAY';
