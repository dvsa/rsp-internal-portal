import fakeEnrichedPenaltyGroups from './fake-penalty-groups-enriched.json';

export default (penaltyGroupId) => {
  const penaltyGroup = fakeEnrichedPenaltyGroups.find(grp => grp.paymentCode === penaltyGroupId);
  if (penaltyGroup) {
    return Promise.resolve(penaltyGroup);
  }
  return Promise.reject(new Error(`group with ID ${penaltyGroupId} not found`));
};
