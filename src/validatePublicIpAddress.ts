import net from "net";
import ipaddr from "ipaddr.js";

/**
 * Check the address if it is public ip address
 * return an Error if the address is ip address
 * return an Error if the ip address is private
 * return an Error if the ip address can not be parsed.
 * return null if the ip address is public
 */
export const validatePublicIpAddress = (address: string): null | Error => {
    // if it is not IP address, skip it
    if (net.isIP(address) === 0) {
        return new Error(`${address} is not ip address.`);
    }
    try {
        const parsedAddress = ipaddr.parse(address);
        const range = parsedAddress.range();
        if (range !== "unicast") {
            return new Error(`${address} is private IP address.`);
        }
        return null;
    } catch (error) {
        return error; // if can not parsed IP address, throw error
    }
};
