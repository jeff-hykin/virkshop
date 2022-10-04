import { Type } from "https://deno.land/std@0.82.0/encoding/_yaml/type.ts"
import * as yaml from "https://deno.land/std@0.82.0/encoding/yaml.ts";

class NixVar {
    name = null
}

export const nixVarSupport = new Type("tag:yaml.org,2002:var", {
    kind: "scalar",
    predicate: function javascriptValueisNixVar(object) {
        return object instanceof NixVar
    },
    resolve: function yamlNodeIsValidNixVar(data) {
        if (typeof data !== 'string') return false
        if (data.length === 0) return false
        
        data = data.trim()
        // if its a variable name
        if (data.match(/^ *\b[a-zA-Z_][a-zA-Z_0-9]*\b *$/)) {
            return true
        } else {
            return false
        }
    },
    construct: function createJavasriptValueFromYamlString(data) {
        const nixVar = new NixVar()
        nixVar.name = data.trim()
        return nixVar
    },
    represent: function nixVarValueToYamlString(object /*, style*/) {
        return object.name
    },
})

// hack it into the default schema (cause .extend() isnt available)
yaml.DEFAULT_SCHEMA.explicit.push(nixVarSupport)
yaml.DEFAULT_SCHEMA.compiledTypeMap.fallback["tag:yaml.org,2002:var"] = nixVarSupport
yaml.DEFAULT_SCHEMA.compiledTypeMap.scalar["tag:yaml.org,2002:var"] = nixVarSupport

console.log(yaml.parse(
    `
    - !!var testing
    `,
    {
        schema: yaml.DEFAULT_SCHEMA,
    },
))