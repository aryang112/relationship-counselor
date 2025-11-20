import { Prisma } from '@prisma/client';

describe('Prisma schema validation', () => {
  it('contains core models required for mediation flow', () => {
    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);

    expect(modelNames).toEqual(
      expect.arrayContaining(['User', 'Couple', 'Session', 'Interview']),
    );
  });

  it('includes user relations for couples and interviews', () => {
    const userModel = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'User',
    );

    expect(userModel).toBeDefined();
    expect(userModel?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['couplesAsUserA', 'couplesAsUserB', 'interviews']),
    );
  });
});
