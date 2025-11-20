import { DMMF } from '@prisma/client/runtime/library';

describe('Prisma schema metadata', () => {
  it('contains core models required for mediation flow', () => {
    const modelNames = DMMF.datamodel.models.map((model) => model.name);

    expect(modelNames).toEqual(
      expect.arrayContaining(['Couple', 'Session', 'Interview']),
    );
  });

  it('includes user relations for couples and interviews', () => {
    const userModel = DMMF.datamodel.models.find(
      (model) => model.name === 'User',
    );

    expect(userModel).toBeDefined();
    expect(userModel?.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['couplesAsUserA', 'couplesAsUserB', 'interviews']),
    );
  });
});
