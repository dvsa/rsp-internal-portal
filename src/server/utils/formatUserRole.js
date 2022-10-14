export default (rawRole) => {
  if(!rawRole){
    return null;
  }
  const isSingleRole = rawRole.indexOf('[') === -1;
  if (isSingleRole) return rawRole;
  return rawRole.slice(1, -1).replace(/\s/g, '').split(',');
};
