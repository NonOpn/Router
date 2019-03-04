"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const MainEntryPoint = __importDefault(require("./build")).default;

const main = new MainEntryPoint();
main.start();