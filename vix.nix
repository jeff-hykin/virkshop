mergeActions = let 
    # prefixing a trace is harder than you think because of additional traces that happen when evaluating the value (thus making prints appear out of order)
    # this tries to fix that
    noValue = { a= b: b; };
    print = (input1: returnValue: 
        let
            input1IsAttrs = builtins.isAttrs input1;  
            prefix = if input1IsAttrs then input1.prefix or null else input1;
            postfix = if input1IsAttrs then input1.postfix or null else null;
            val = if input1IsAttrs then input1.val or noValue else noValue;
            
            printValue = if val == noValue then returnValue else val;
            ending = (builtins.trace
                printValue
                (if postfix == null then
                    returnValue
                else
                    (builtins.trace
                        postfix
                        returnValue
                    )
                )
            );
        in
            if prefix == null then
                ending
            else
                (builtins.trace
                    (if (builtins.tryEval printValue).success then
                        prefix+":"
                    else
                        returnValue # if it fails its going to throw anyways and not get here
                    )
                    ending
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
                if !(builtins.isAttrs (print "maybeAttrSet ${builtins.toJSON path}" maybeAttrSet)) then
                    maybeAttrSet
                # TODO: consider exploring/evaling lists too (revisit once merging-of-lists is supported)
                else
                    let
                        shallowEvaled = (
                            if print "isMergeToolResult1" (isMergeToolResult maybeAttrSet) then
                                maybeAttrSet.eval path
                            else
                                maybeAttrSet
                        );
                    in
                        if !(builtins.isAttrs shallowEvaled) then
                            shallowEvaled
                        else 
                            (builtins.foldl'
                                (accumulator: keyGettingMerged:
                                    accumulator // {
                                        ${keyGettingMerged} = (recursiveEvaluateMergeToolResults
                                            shallowEvaled.${keyGettingMerged}
                                            (path ++ [ keyGettingMerged ])
                                        ); 
                                    }
                                )
                                shallowEvaled
                                (builtins.attrNames shallowEvaled)
                            )
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
                        mergeToolFunction {
                            valueExisted = hasDeepAttribute accumulator attrSetPath;
                            prevValue = getDeepAttribute accumulator attrSetPath;
                        }
                    );
                }
            );
            
            recursiveMerge = ({oldValue, newValue, path ? []}:
                let
                    newValueResult = (
                        if print "isMergeToolResult2" (isMergeToolResult newValue) then
                            newValue.eval path
                        else
                            newValue
                    );
                    # make sure all the mergeToolResults are evaluated
                    # newValueResult = recursiveEvaluateMergeToolResults newValue path;
                in
                    (recursiveEvaluateMergeToolResults 
                        (
                            # note this check NEEDS to be on newValue NOT newValueResult
                            # a merge tool value always wins (it will handle merging)
                            # if (print {prefix="path0";val=path;} ((print {prefix="oldValue0";val=oldValue;}) ((print {prefix="newValue0";val=newValue;}) (isMergeToolResult newValue)))) then
                            if print "isMergeToolResult" (isMergeToolResult (print "newValue to check" newValue)) then
                                (recursiveRemoveDeleteKeys newValueResult)
                            # TODO: this is where list-merging should be added in the future
                            # if either is non-attrSet, new value wins
                            else if (!(builtins.isAttrs oldValue) || !(builtins.isAttrs newValueResult)) then
                                (recursiveRemoveDeleteKeys newValueResult)
                            # if both are normal attrSets, then merge
                            # (it should* be impossible for oldValue to be a mergeToolResult)
                            else
                                let
                                    allKeys = (builtins.attrNames newValueResult);
                                    keysToDelete = (builtins.filter
                                        (key: newValueResult.${key} == mergeToolDeleteIdentifier)
                                        allKeys
                                    );
                                    keysToCheck = (builtins.filter
                                        (key: newValueResult.${key} != mergeToolDeleteIdentifier)
                                        allKeys
                                    );
                                    oldValueAfterDeletingKeys = (builtins.removeAttrs oldValue keysToDelete);
                                in 
                                    (builtins.foldl'
                                        (accumulator: keyGettingMerged:
                                            let
                                                innerOldValueExists = builtins.hasAttr keyGettingMerged accumulator;
                                                innerOldValue = accumulator.${keyGettingMerged};
                                                innerNewValue = newValueResult.${keyGettingMerged};
                                                oldValue = (if innerOldValueExists then accumulator.${keyGettingMerged} else null);
                                            in
                                                accumulator // {
                                                    ${keyGettingMerged} = (recursiveMerge {
                                                        oldValue = print "oldValue getting merged" oldValue;
                                                        newValue = print "newValue getting merged" innerNewValue;
                                                        path = print "path getting merged" (path ++ [ keyGettingMerged ]);
                                                    });
                                                }
                                        )
                                        oldValueAfterDeletingKeys
                                        keysToCheck
                                    )
                        )
                        path
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
                                print "newValue" newValue
                            ));
                            # mergeTools.noChange
                            noChange = (makeMergeToolResult accumulator ({ valueExisted, prevValue }:
                                # always give prevValue. This is used in if statements. Ex: (if system == "x86_64-linux" then 10 else mergeTools.noChange)
                                prevValue
                            ));
                            # mergeTools.softMerge
                            softMerge = (newValue: makeMergeToolResult accumulator ({ valueExisted, prevValue }:
                                if valueExisted then
                                    prevValue
                                else
                                    newValue
                            ));
                            # this technically isn't a mergeToolResult, its its own special value and needs special handling
                            delete = mergeToolDeleteIdentifier;
                            # TODO: mergeTools.appendToFront        # for list merging
                            # TODO: mergeTools.appendToBack         # for list merging
                            # TODO: mergeTools.splice start length  # for list merging (splice will handle removal and injection) have it support negative start
                        };
                        next = action accumulator mergeTools;
                    in
                        (recursiveMerge { oldValue=accumulator; newValue=next; path=[]; })
                )
                {} # Initial value of `accumulator`
                actions
            )
    );
in
    # builtins.length (builtins.attrNames oldValue) == 0
    mergeActions

a =(mergeActions [
    (prev: mergeTools: { b = { a=1; }; })
    # (prev: mergeTools: { a = 11; b.c = 13; })
    # (prev: mergeTools: { a = 12; b.g = 88; })
    (prev: mergeTools: { b = { workd=1; }; })
])