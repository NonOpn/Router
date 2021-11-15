import express from "express";

import Diagnostic from "../../diagnostic/Diagnostic";

const router = express.Router();

router.post("/diagnostic.json", (req: any, res: any) => {
  if(res && res.body) {
    var body: any = undefined;
    try {
      if(typeof res.body == "string") body = JSON.parse(res.body);
    } catch(e) {
      body = res.body;
    }

    Diagnostic.onConfiguration(body);
    res.json(body);
  } else {
    res.status(500).json({error: "invalid body received"});
  }
});

export default router;
