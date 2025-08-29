let 
    recursiveUpdateUntil = (pred: lhs: rhs:
        let
            recursiveCall = (attrPath:
                builtins.zipAttrsWith (n: values:
                    let
                        here = attrPath ++ [ n ];
                    in
                        if builtins.length values == 1 || pred here (builtins.elemAt values 1) (builtins.head values) then
                            builtins.head values
                        else
                            recursiveCall here values
                )
            );
        in
            recursiveCall [ ] [ rhs lhs ]
    );
    recursiveUpdate = (lhs: rhs:
        (recursiveUpdateUntil
            (path: lhs: rhs:
                !(isAttrs lhs && isAttrs rhs)
            )
            lhs
            rhs
        )
    );
    hasDeepAttribute = (
        let
            hasDeepAttributeInner = (attrSet: path:
                (builtins.foldl'
                    (acc: key:
                        if acc != null && builtins.isAttrs acc && builtins.hasAttr key acc then
                            acc.${key}
                        else
                            null
                    )
                    attrSet
                    (if (path != null && builtins.isList path) then path else [])
                )
            );
        in
            # Final result is: was the value resolved to something non-null?
            attrSet: path: hasDeepAttributeInner attrSet path != null
    );
    getDeepAttribute = (attrSet: path:
        (builtins.foldl'
            (acc: key:
                if acc != null && builtins.isAttrs acc && builtins.hasAttr key acc then
                    acc.${key}
                else
                    null
            )
            attrSet
            path
        )
    );
    # TODO: there is likely a more efficient way to do this
    # deleteAttributes = (
    #     let
    #         deleteAttributesInner = attrSet: path:
    #             if path == [] then
    #                 attrSet
    #             else
    #                 let
    #                     key = builtins.head path;
    #                     rest = builtins.tail path;
    #                 in
    #                     if !builtins.hasAttr key attrSet then
    #                         attrSet
    #                     else if rest == [] then
    #                         builtins.removeAttrs attrSet [ key ]
    #                     else
    #                         let
    #                             sub = attrSet.${key};
    #                             updatedSub =
    #                                 if builtins.isAttrs sub then
    #                                     deleteAttributesInner sub rest
    #                                 else
    #                                     sub;
    #                         in
    #                             attrSet // {
    #                                 ${key} = updatedSub;
    #                             };
    #     in
    #         deleteAttributesInner
    # );

    # hasDeepAttribute { a={b={c=10;};}; } [ "a" "b" "c" ] # true
    # hasDeepAttribute { a={b={c=10;};}; } [ "a" "b" "f" ] # false
    recursiveMerge = (base: newValues:
        if !builtins.isAttrs newValues then
            newValues
        else if !builtins.isAttrs base then
            newValues
        else 
            (builtins.foldl'
                (accumulator: keyGettingMerged:
                    let
                        oldValueExists = (builtins.hasAttr
                            keyGettingMerged
                            base
                        );
                        oldValue = accumulator.${keyGettingMerged};
                        newValue = newValues.${keyGettingMerged};
                    in
                        if !oldValueExists then
                            accumulator // { ${keyGettingMerged} = newValues.${keyGettingMerged}; }
                        else if builtins.isAttrs oldValue && builtins.isAttrs newValue then
                            accumulator // { ${keyGettingMerged} = recursiveMerge oldValue newValue; }
                        else
                            accumulator // { ${keyGettingMerged} = newValue; }
                )
                base
                (builtins.attrNames newValues)
            )
    );
    # g = recursiveMerge { a=10; c = {d=10;}; } { a=11; c={f=9;};}    
    mergeActions = (actions:
        let
            # this is a kind of "magic attrSet" e.g. an attrSet that only equal to itself (because of the function attribute)
            # we are going to use this to check if the value in a key-value pair is the result of a mergeTool (and therefore needs to be evaluated)
            mergeToolResultIdentifier = { f=x: x; };
            mergeToolDeleteIdentifier = { f=x: x; };
            
            # checker
            isMergeToolResult = attrSet: builtins.isAttrs attrSet && (builtins.hasAttr "mergeToolResultIdentifier" attrSet) && attrSet.mergeToolResultIdentifier == mergeToolResultIdentifier;
            
            # make sure all the mergeToolResults are evaluated
            recursiveEvaluateMergeToolResults = (maybeAttrSet: path:
                if !builtins.isAttrs maybeAttrSet then
                    maybeAttrSet
                # TODO: consider exploring/evaling lists too (revisit once merging-of-lists is supported)
                else
                    let
                        shallowEvaled = (
                            if isMergeToolResult maybeAttrSet then
                                maybeAttrSet.eval path
                            else
                                maybeAttrSet
                        );
                        deepEval = (builtins.foldl'
                            (accumulator: keyGettingMerged:
                                accumulator // {
                                    ${keyGettingMerged} = (recursiveEvaluateMergeToolResults
                                        shallowEvaled.${keyGettingMerged}
                                        (path ++ [ keyGettingMerged ])
                                    ); 
                                }
                            )
                            shallowEvaled
                            (builtins.attrNames shallowEval)
                        );
                    in
                        deepEval
            );
            
            # this should be called before putting something on the accumulator or giving a value to the user
            recursiveRemoveDeleteKeys = (maybeAttrSet:
                if maybeAttrSet == mergeToolDeleteIdentifier then
                    # NOTE: this shouldn't happen / be allowed it would mean mergeTools.delete was used incorrectly (top level)
                    #       consider making this an error
                    null
                else if !builtins.isAttrs maybeAttrSet then
                    maybeAttrSet
                # TODO: consider exploring/evaling lists too (revisit once merging-of-lists is supported)
                else
                    let
                        keysToDelete = (builtins.filter
                            (key: maybeAttrSet.${key} == mergeToolDeleteIdentifier)
                            (builtins.attrNames maybeAttrSet)
                        );
                        withoutDeleteKeys = builtins.removeAttrs maybeAttrSet keysToDelete;
                        deepEval = (builtins.foldl'
                            (accumulator: keyGettingMerged:
                                accumulator // {
                                    ${keyGettingMerged} = (recursiveRemoveDeleteKeys
                                        withoutDeleteKeys.${keyGettingMerged}
                                    ); 
                                }
                            )
                            withoutDeleteKeys
                            (builtins.attrNames withoutDeleteKeys)
                        );
                    in
                        deepEval
            );
            
            # a helper for making mergeTools
            # prev is the previous whole attrSet (e.g. the accumulator)
            # mergeToolFunction needs to accept an argument of { valueExisted, attrPathOldValue } and return the new value for that attribute
            # attrSetPath will be given by the recursiveMerge evaluator (at the very end)
            makeMergeToolResult = (accumulator: mergeToolFunction:
                {
                    inherit mergeToolResultIdentifier; # this is how we can identify this attrSet is special and not just a user-provided value
                    eval = (attrSetPath:
                        let
                            # eval the old value, cause maybe it's a mergeToolResult that wasn't touched yet cause it hadn't been merged with anything
                            oldValue = if isMergeToolResult base then base.eval path else base;
                        in
                            mergeToolFunction {
                                valueExisted = hasDeepAttribute accumulator attrSetPath;
                                prevValue = getDeepAttribute accumulator attrSetPath;
                            }
                    );
                }
            );
            
            recursiveMerge = ({oldValue, newValue, path ? []}:
                let
                    # make sure all the mergeToolResults are evaluated
                    newValueResult = recursiveEvaluateMergeToolResults newValue path;
                in
                    # note this check NEEDS to be on newValue NOT newValueResult
                    # a merge tool value always wins (it will handle merging)
                    if isMergeToolResult newValue then
                        (recursiveRemoveDeleteKeys newValueResult)
                    # TODO: this is where list-merging should be added in the future
                    # if either is non-attrSet, new value wins
                    else if !(builtins.isAttrs oldValue || builtins.isAttrs newValue || builtins.length (builtins.attrNames oldValue) == 0) then
                        (recursiveRemoveDeleteKeys newValueResult)
                    # if both are normal attrSets, then merge
                    # (it should* be impossible for oldValue to be a mergeToolResult)
                    else
                        let
                            keysToDelete = (builtins.filter
                                (key: newValueResult.${key} == mergeToolDeleteIdentifier)
                                (builtins.attrNames newValueResult)
                            );
                            keysToCheck = (builtins.filter
                                (key: newValueResult.${key} != mergeToolDeleteIdentifier)
                                (builtins.attrNames newValueResult)
                            );
                            oldValueAfterDeletingKeys = builtins.removeAttrs oldValue keysToDelete;
                        in 
                            (builtins.foldl'
                                (accumulator: keyGettingMerged:
                                    let
                                        innerOldValueExists = builtins.hasAttr keyGettingMerged accumulator;
                                        innerOldValue = accumulator.${keyGettingMerged};
                                        innerNewValue = newValueResult.${keyGettingMerged};
                                    in
                                        recursiveMerge {
                                            oldValue = if innerOldValueExists then accumulator.${keyGettingMerged} else null;
                                            newValue = innerNewValue;
                                            path = path ++ [ keyGettingMerged ];
                                        }
                                )
                                oldValueAfterDeletingKeys
                                keysToCheck
                            )
            );
        in
            (builtins.foldl'
                (accumulator: action:
                    let
                        # then, somehow, get a list of these magic attrSets into a recursive evaluator (e.g. like recursiveMerge) that detects those magic attrSets and gives them the attrPath
                        mergeTools = {
                            # mergeTools.override
                            override = (newValue: makeMergeToolResult accumulator ({ valueExisted, prevValue }:
                                # always give new value, (e.g. skip merge)
                                newValue
                            ));
                            # mergeTools.noChange
                            noChange = (makeMergeToolResult accumulator ({ valueExisted, prevValue }:
                                # always give prevValue. This is used in if statements. Ex: (if system == "x86_64-linux" then 10 else mergeTools.noChange)
                                prevValue
                            ));
                            # TODO: mergeTools.softMerge
                            # this technically isn't a mergeToolResult, its its own special value and needs special handling
                            delete = mergeToolDeleteIdentifier;
                            # TODO: mergeTools.override
                            # TODO: mergeTools.appendToFront
                            # TODO: mergeTools.appendToBack
                        };
                        next = action prev mergeTools;
                    in
                        recursiveMerge prev next
                )
                {} # Initial value of `prev`
                actions
            )
    );
    # result = mergeActions [
    #     (prev: mergeTools: { a = 10; })
    #     (prev: mergeTools: { a = 11; b.c = 13; })
    #     (prev: mergeTools: { a = 12; b.g = 88; })
    # ];
in
    {
        inherit recursiveUpdateUntil mergeActions;
    }
        