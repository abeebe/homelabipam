"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSites = getSites;
exports.getNetworks = getNetworks;
exports.getClients = getClients;
exports.getDevices = getDevices;
exports.testConnection = testConnection;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const prisma_1 = require("../prisma");
async function getConfig() {
    const rows = await prisma_1.prisma.setting.findMany({
        where: { key: { in: ['UNIFI_URL', 'UNIFI_API_KEY'] } },
    });
    const map = Object.fromEntries(rows.map(r => [r.key, r.value ?? '']));
    return {
        url: map['UNIFI_URL'] || process.env.UNIFI_URL || '',
        apiKey: map['UNIFI_API_KEY'] || process.env.UNIFI_API_KEY || process.env['UNIFI-X-APIKEY'] || '',
    };
}
async function createClient() {
    const { url: baseURL, apiKey } = await getConfig();
    if (!baseURL)
        throw new Error('UNIFI_URL is not configured. Set it in Settings.');
    if (!apiKey)
        throw new Error('UNIFI_API_KEY is not configured. Set it in Settings.');
    return axios_1.default.create({
        baseURL,
        headers: {
            'X-API-KEY': apiKey,
            'Accept': 'application/json',
        },
        // UniFi uses self-signed certificates
        httpsAgent: new https_1.default.Agent({ rejectUnauthorized: false }),
        timeout: 10000,
    });
}
async function fetchAllPages(fetcher) {
    const limit = 100;
    const all = [];
    let offset = 0;
    while (true) {
        const { data, totalCount } = await fetcher(offset, limit);
        all.push(...data);
        if (all.length >= totalCount)
            break;
        offset = all.length;
    }
    return all;
}
async function getSites() {
    const client = await createClient();
    const res = await client.get('/proxy/network/integration/v1/sites');
    return res.data.data ?? res.data;
}
async function getNetworks(siteId) {
    const client = await createClient();
    const res = await client.get(`/proxy/network/integration/v1/sites/${siteId}/networks`);
    return res.data.data ?? res.data;
}
async function getClients(siteId) {
    const client = await createClient();
    return fetchAllPages(async (offset, limit) => {
        const res = await client.get(`/proxy/network/integration/v1/sites/${siteId}/clients`, {
            params: { offset, limit },
        });
        return { data: res.data.data ?? [], totalCount: res.data.totalCount ?? 0 };
    });
}
async function getDevices(siteId) {
    const client = await createClient();
    return fetchAllPages(async (offset, limit) => {
        const res = await client.get(`/proxy/network/integration/v1/sites/${siteId}/devices`, {
            params: { offset, limit },
        });
        return { data: res.data.data ?? [], totalCount: res.data.totalCount ?? 0 };
    });
}
async function testConnection() {
    const { url } = await getConfig();
    const displayUrl = url || 'not configured';
    try {
        const sites = await getSites();
        return { connected: true, url: displayUrl, siteCount: sites.length };
    }
    catch (err) {
        return { connected: false, url: displayUrl, error: err.message };
    }
}
