import axios from 'axios';

const createInstance = (baseURL, headers = { Authorization: 'allow' }) => axios.create({
  baseURL,
  headers,
});

export default createInstance;
