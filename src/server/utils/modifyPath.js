export default (path) => {
  const split = path.split('/');
  split.splice(0, 2);
  return `/${split.join('/')}`;
};
