/**
 * DOC_TBA
 *
 * @name czm_raySegmentCollectionCapacity
 * @glslConstant 
 *
 * @see czm_raySegmentCollection
 */
const int czm_raySegmentCollectionCapacity = 4;

/**
 * DOC_TBA
 *
 * @name czm_raySegmentCollection
 * @glslStruct
 *
 * @see czm_raySegmentCollectionCapacity
 * @see czm_raySegment
 */
struct czm_raySegmentCollection
{
    czm_raySegment intervals[czm_raySegmentCollectionCapacity];
    int count;
};

/**
 * DOC_TBA
 *
 * @name czm_raySegmentCollectionNew
 * @glslFunction
 *
 */
czm_raySegmentCollection czm_raySegmentCollectionNew()
{
    czm_raySegment intervals[czm_raySegmentCollectionCapacity];
    czm_raySegmentCollection i = czm_raySegmentCollection(intervals, 0);
    return i;
}

czm_raySegmentCollection czm_raySegmentCollectionNew(czm_raySegment segment)
{
    czm_raySegment intervals[czm_raySegmentCollectionCapacity];
    intervals[0] = segment;
    czm_raySegmentCollection i = czm_raySegmentCollection(intervals, 1);
    return i;
}

czm_raySegmentCollection czm_raySegmentCollectionNew(czm_raySegment first, czm_raySegment second)
{
    czm_raySegment intervals[czm_raySegmentCollectionCapacity];
    intervals[0] = first;
    intervals[1] = second;
    czm_raySegmentCollection i = czm_raySegmentCollection(intervals, 2);
    return i;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name czm_removeAt
 * @glslFunction
 *
 */
void czm_removeAt(inout czm_raySegmentCollection collection, int index)
{
    --collection.count;
    for (int i = 0; i < czm_raySegmentCollectionCapacity; ++i)
    {
        if (i >= index && i < collection.count)
        {
            collection.intervals[i] = collection.intervals[i + 1];
        }
        else if (i == collection.count)
        {
            break;
        }
    }
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name czm_insertAt
 * @glslFunction
 *
 */
void czm_insertAt(inout czm_raySegmentCollection collection, czm_raySegment segment, int index)
{
    for (int i = czm_raySegmentCollectionCapacity - 1; i >= 0; --i)
    {
        if (i <= collection.count && i > index)
        {
            collection.intervals[i] = collection.intervals[i - 1];
        }
        else if (i == index)
        {
            collection.intervals[i] = segment;
        }
        else if (i < index)
        {
            break;
        }
    }
    ++collection.count;
}

void czm_insertAt(inout czm_raySegmentCollection collection, czm_raySegmentCollection segments, int index)
{
    if (segments.count == 1)
    {
        czm_insertAt(collection, segments.intervals[0], index);
    }
    else
    {
        for (int i = czm_raySegmentCollectionCapacity - 1; i >= 0; --i)
        {
            if (i < segments.count)
            {
                czm_insertAt(collection, segments.intervals[i], index);
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name czm_complement
 * @glslFunction
 *
 */
void czm_complement(czm_raySegment segment, out czm_raySegmentCollection collection)
{
    if (czm_isEmpty(segment))
    {
        collection = czm_raySegmentCollectionNew(czm_fullRaySegment);
    }
    else if (segment.stop == czm_infinity)
    {
        if (segment.start == 0.0)
        {
	        collection = czm_raySegmentCollectionNew();
        }
        else
        {
	        collection = czm_raySegmentCollectionNew(czm_raySegment(0.0, segment.start));
        }
    }
    else if (segment.start == 0.0)
    {
        collection = czm_raySegmentCollectionNew(czm_raySegment(segment.stop, czm_infinity));
    }
    else
    {
	    czm_raySegment head = czm_raySegment(0.0, segment.start);
	    czm_raySegment tail = czm_raySegment(segment.stop, czm_infinity);
	    collection = czm_raySegmentCollectionNew(head, tail);
    }        
}

czm_raySegmentCollection czm_complement(czm_raySegmentCollection collection)
{
    if (collection.count == 0)
    {
        czm_raySegmentCollection result = czm_raySegmentCollectionNew(czm_fullRaySegment);
        return result;
    }
    else if (collection.count == 1)
    {
        czm_raySegmentCollection result;
        czm_complement(collection.intervals[0], result);
        return result;
    }

    czm_raySegmentCollection result = czm_raySegmentCollectionNew();

    for (int i = 0; i < czm_raySegmentCollectionCapacity; ++i)
    {
        if (i < collection.count)
        {
            float start = collection.intervals[i].stop;
            if (i < collection.count - 1)
            {
                float stop = collection.intervals[i + 1].start;
                result.intervals[i] = czm_raySegment(start, stop);
                ++result.count;
            }
            else if (start != czm_infinity)
            {
                result.intervals[i] = czm_raySegment(start, czm_infinity);
                ++result.count;
            }
        }
        else
        {
            break;
        }
    }
    
    if (collection.count > 0)
    {
        float stop = collection.intervals[0].start;
        if (stop != 0.0)
        {
            // PERFORMANCE TODO: See if the additional loop iteration from the insert can be eliminated.
            czm_insertAt(result, czm_raySegment(0.0, stop), 0);
        }
    }
    
    return result;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name czm_union
 */
czm_raySegmentCollection czm_union(czm_raySegment left, czm_raySegment right)
{
    if (czm_isFull(left) || czm_isFull(right))
    {
        czm_raySegmentCollection result = czm_raySegmentCollectionNew(czm_fullRaySegment);
        return result;
    }

    float stop = min(left.stop, right.stop);
    float start = max(left.start, right.start);
    
    if (stop < start) // No intersection.
    {
        czm_raySegmentCollection result = (left.start < right.start) ? czm_raySegmentCollectionNew(left, right) : czm_raySegmentCollectionNew(right, left);
        return result;
    }

    czm_raySegmentCollection result = czm_raySegmentCollectionNew(czm_raySegment(min(left.start, right.start), max(left.stop, right.stop)));
    return result;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Determines the intersection of two time intervals.  If they do not intersect, an
 * empty time interval, <code>czm_emptyRaySegment</code>, is returned.
 *
 * @name czm_intersection
 * @glslFunction 
 *
 * @param {czm_raySegment} left One interval.
 * @param {czm_raySegment} right The other interval.
 *
 * @returns {czm_raySegment} The intersection of <code>left</code> and <code>right</code>.
 * 
 * @see czm_unionRaySegments
 * @see czm_subtraction  
 * @see czm_isEmpty
 *
 * @example
 * czm_raySegment i0 = czm_intersection(czm_raySegment(1.0, 2.0), czm_raySegment(3.0, 4.0));    // Empty
 * czm_raySegment i1 = czm_intersection(czm_raySegment(1.0, 3.0), czm_raySegment(2.0, 4.0));    // (2.0, 3.0)
 */
czm_raySegment czm_intersection(czm_raySegment left, czm_raySegment right)
{
    float stop = min(left.stop, right.stop);
    
    if (stop < 0.0)
    {
        return czm_emptyRaySegment;
    }

    float start = max(left.start, right.start);
    
    if (stop < start)
    {
        return czm_emptyRaySegment;
    }

    czm_raySegment s = czm_raySegment(start, stop);
    return s;
}

czm_raySegmentCollection czm_intersection(czm_raySegmentCollection left, czm_raySegment right)
{
    if (left.count == 1)
    {
        czm_raySegment intersection = czm_intersection(left.intervals[0], right);
        
        if (czm_isEmpty(intersection))
        {
            czm_raySegmentCollection result = czm_raySegmentCollectionNew();
            
            return result;
        }
        else
        {
            czm_raySegmentCollection result = czm_raySegmentCollectionNew(intersection);
            
            return result;
        }
    }

    czm_raySegmentCollection result = czm_raySegmentCollectionNew();
    
    for (int leftIndex = 0; leftIndex < czm_raySegmentCollectionCapacity; ++leftIndex)
    {
        if (leftIndex < left.count)
        {
            czm_raySegment intersection = czm_intersection(left.intervals[leftIndex], right);
            if (!czm_isEmpty(intersection))
            {
                czm_insertAt(result, intersection, result.count);
            }
        }
        else
        {
            break;
        }
    }

    return result;
}

czm_raySegmentCollection czm_intersection(czm_raySegmentCollection left, czm_raySegmentCollection right)
{
    if (right.count == 1)
    {
        if (left.count == 1)
        {
            czm_raySegment intersection = czm_intersection(left.intervals[0], right.intervals[0]);
            
	        if (czm_isEmpty(intersection))
	        {
	            czm_raySegmentCollection result = czm_raySegmentCollectionNew();
	            
	            return result;
	        }
	        else
	        {
	            czm_raySegmentCollection result = czm_raySegmentCollectionNew(intersection);
	            
	            return result;
	        }
        }
        else
        {
            czm_raySegmentCollection result = czm_intersection(left, right.intervals[0]);
            
            return result;
        }
    }

    czm_raySegmentCollection result = czm_raySegmentCollectionNew();
    
    if (left.count > 0 && right.count > 0)
    {
        for (int leftIndex = 0; leftIndex < czm_raySegmentCollectionCapacity; ++leftIndex)
        {
            if (leftIndex < left.count)
            {
                for (int rightIndex = 0; rightIndex < czm_raySegmentCollectionCapacity; ++rightIndex)
                {
                    // TODO:  Figure out why this isn't "rightIndex < right.count".
                    if (rightIndex <= right.count && left.intervals[leftIndex].stop >= right.intervals[rightIndex].start)
                    {
	                    czm_raySegment intersection = czm_intersection(left.intervals[leftIndex], right.intervals[rightIndex]);
	                    if (!czm_isEmpty(intersection))
	                    {
                            czm_insertAt(result, intersection, result.count);
                        }
                    }
                    else
                    {
                        break;
	                }
                }
            }
            else
            {
                break;
            }
        }
    }

    return result;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Subtracts one time interval from another, resulting in zero, one, or two non-empty time intervals.
 * 
 * @name czm_subtraction
 * @glslFunction
 *
 * @param {czm_raySegment} outer The outer interval.
 * @param {czm_raySegment} inner The inner interval that is subtracted from <code>outer</code>.
 * 
 * @returns {czm_raySegmentCollection} The time intervals resulting from <code>outer - inner</code>.
 *
 * @see czm_intersection
 * @see czm_unionRaySegments
 *
 * @example
 * czm_raySegmentCollection i0 = czm_subtraction(
 *   czm_raySegment(1.0, 4.0), czm_raySegment(2.0, 3.0)); 
 * // i0 is [(1.0, 2.0), (3.0, 4.0)]
 * 
 * czm_raySegmentCollection i1 = czm_subtraction(
 *   czm_raySegment(1.0, 4.0), czm_raySegment(1.0, 2.0));
 * // i1 is [(2.0, 4.0)]
 * 
 * czm_raySegmentCollection i2 = czm_subtraction(
 *   czm_raySegment(1.0, 4.0), czm_raySegment(5.0, 6.0));
 * // i2 is []
 */
czm_raySegmentCollection czm_subtraction(czm_raySegment outer, czm_raySegment inner)
{
    // This function has ANGLE workarounds:  http://code.google.com/p/angleproject/issues/detail?id=185

    czm_raySegmentCollection i = czm_raySegmentCollectionNew();

    czm_raySegment intersection = czm_intersection(outer, inner);
    
    if (czm_isEmpty(intersection) || (intersection.start == intersection.stop))
    {
        // No intersection, or intersection at an end point; subtraction doesn't change outer.
        i.count = 1;
        i.intervals[0] = outer;
    }
    else
    {
        if ((intersection.start == outer.start) && (intersection.stop == outer.stop))
        {
            // outer and inner are the same interval; subtracting them yields empty intervals.
            i.count = 0;
        }
        else if (intersection.start == outer.start)
        {
            // inner is completely inside outer, and touching the left boundary; subtraction yields one interval
            i.count = 1;
            i.intervals[0] = czm_raySegment(inner.stop, outer.stop);
        }
        else if (intersection.stop == outer.stop)
        {
            // inner is completely inside outer, and touching the right boundary; subtraction yields one interval
            i.count = 1;
            i.intervals[0] = czm_raySegment(outer.start, inner.start);
        }
        else
        {
            // inner is completely inside outer, but not on a boundary; break outer into two intervals
            i.count = 2;
            i.intervals[0] = czm_raySegment(outer.start, inner.start);
            i.intervals[1] = czm_raySegment(inner.stop, outer.stop);
        }
    }
    
    return i;
}

/**
 * DOC_TBA
 *
 * @name czm_subtraction
 */
czm_raySegmentCollection czm_subtraction(czm_raySegmentCollection left, czm_raySegment right)
{
    if (left.count == 1)
    {
        czm_raySegmentCollection result = czm_subtraction(left.intervals[0], right);
        
        return result;
    }

    czm_raySegmentCollection result = czm_raySegmentCollectionNew();
    
    for (int leftIndex = 0; leftIndex < czm_raySegmentCollectionCapacity; ++leftIndex)
    {
        if (leftIndex < left.count)
        {
            czm_raySegmentCollection segments = czm_subtraction(left.intervals[leftIndex], right);
            if (segments.count != 0)
            {
                czm_insertAt(result, segments, result.count);
            }
        }
        else
        {
            break;
        }
    }

    return result;
}

/**
 * DOC_TBA
 *
 * @name czm_subtraction
 */
czm_raySegmentCollection czm_subtraction(czm_raySegmentCollection left, czm_raySegmentCollection right)
{
    if (right.count == 1)
    {
        if (left.count == 1)
        {
            czm_raySegmentCollection result = czm_subtraction(left.intervals[0], right.intervals[0]);
            
            return result;
        }
        else
        {
	        czm_raySegmentCollection result = czm_subtraction(left, right.intervals[0]);
	        
	        return result;
        }
    }

    // PERFORMANCE TODO: See if these two calls (with separate loop iterations) can be combined into one loop.
    czm_raySegmentCollection complement = czm_complement(right);

    czm_raySegmentCollection result = czm_intersection(left, complement);
    
    return result;
}
